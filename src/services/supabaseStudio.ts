import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type MediaRow = Database['public']['Tables']['project_media_assets']['Row'];
type ClipRow = Database['public']['Tables']['timeline_clips']['Row'];

type MediaKind = MediaRow['kind'];
export type PersistentMediaAsset = MediaRow & { signedUrl: string };
export type PersistentTimelineClip = ClipRow & { audioUrl: string };
export type TrackMixSettings = Record<string, { muted: boolean; volume: number }>;
export type PersistentStudioWorkspace = {
  scene: PersistentMediaAsset | null;
  clips: PersistentTimelineClip[];
  playbackPositionSeconds: number;
  trackMix: TrackMixSettings;
  revision: number;
};

function client() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}

async function currentUserId() {
  const { data, error } = await client().auth.getUser();
  if (error || !data.user) throw new Error('Sign in is required to save studio media.');
  return data.user.id;
}

async function signedUrl(objectPath: string) {
  const { data, error } = await client().storage.from('dubroom-media').createSignedUrl(objectPath, 60 * 60);
  if (error || !data?.signedUrl) throw error ?? new Error('The private media URL could not be created.');
  return data.signedUrl;
}

async function mapAsset(row: MediaRow): Promise<PersistentMediaAsset> {
  return { ...row, signedUrl: await signedUrl(row.object_path) };
}

function safeFileName(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'media';
}

function normalizeTrackMix(value: unknown): TrackMixSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: TrackMixSettings = {};
  for (const [userId, setting] of Object.entries(value)) {
    if (!setting || typeof setting !== 'object' || Array.isArray(setting)) continue;
    const candidate = setting as { muted?: unknown; volume?: unknown };
    const volume = typeof candidate.volume === 'number' && Number.isFinite(candidate.volume)
      ? Math.max(0, Math.min(1, candidate.volume))
      : 1;
    result[userId] = { muted: candidate.muted === true, volume };
  }
  return result;
}

async function insertUpload(input: { projectId: string; roomId: string; kind: MediaKind; file: File | Blob; fileName: string; contentType: string }) {
  const userId = await currentUserId();
  const assetId = crypto.randomUUID();
  const objectPath = `${input.projectId}/${assetId}-${safeFileName(input.fileName)}`;
  const { data: inserted, error: insertError } = await client()
    .from('project_media_assets')
    .insert({
      id: assetId,
      project_id: input.projectId,
      room_id: input.roomId,
      uploaded_by: userId,
      kind: input.kind,
      object_path: objectPath,
      file_name: input.fileName,
      content_type: input.contentType || 'application/octet-stream',
      size_bytes: input.file.size,
      upload_status: 'uploading',
    })
    .select('*')
    .single();
  if (insertError || !inserted) throw insertError ?? new Error('The media record could not be created.');
  const { error: uploadError } = await client().storage.from('dubroom-media').upload(objectPath, input.file, {
    contentType: input.contentType || 'application/octet-stream',
    upsert: false,
  });
  if (uploadError) {
    await client().from('project_media_assets').update({ upload_status: 'failed' }).eq('id', assetId);
    throw uploadError;
  }
  const { data: ready, error: readyError } = await client()
    .from('project_media_assets')
    .update({ upload_status: 'ready' })
    .eq('id', assetId)
    .select('*')
    .single();
  if (readyError || !ready) throw readyError ?? new Error('The uploaded media could not be finalized.');
  return mapAsset(ready);
}

export const supabaseStudioService = {
  async getWorkspace(projectId: string): Promise<PersistentStudioWorkspace> {
    const db = client();
    const [{ data: state, error: stateError }, { data: assets, error: assetError }, { data: clips, error: clipError }] = await Promise.all([
      db.from('project_editor_state').select('project_id, room_id, scene_asset_id, playback_position_seconds, track_mix, revision, updated_by, updated_at').eq('project_id', projectId).maybeSingle(),
      db.from('project_media_assets').select('*').eq('project_id', projectId).eq('upload_status', 'ready').order('created_at', { ascending: false }),
      db.from('timeline_clips').select('*').eq('project_id', projectId).order('start_seconds', { ascending: true }).order('sort_order', { ascending: true }),
    ]);
    if (stateError) throw stateError;
    if (assetError) throw assetError;
    if (clipError) throw clipError;
    const media = assets ?? [];
    const sceneRow = (state?.scene_asset_id ? media.find((asset) => asset.id === state.scene_asset_id) : undefined)
      ?? media.find((asset) => asset.kind === 'scene')
      ?? null;
    const audioAssets = new Map(media.filter((asset) => asset.kind === 'audio').map((asset) => [asset.id, asset]));
    const [scene, ...clipUrls] = await Promise.all([
      sceneRow ? mapAsset(sceneRow) : Promise.resolve(null),
      ...(clips ?? []).map(async (clip) => {
        const audioAsset = audioAssets.get(clip.media_asset_id);
        if (!audioAsset) return null;
        return { clip, audioUrl: await signedUrl(audioAsset.object_path) };
      }),
    ]);
    return {
      scene,
      clips: clipUrls.flatMap((entry) => entry ? [{ ...entry.clip, audioUrl: entry.audioUrl }] : []),
      playbackPositionSeconds: Number(state?.playback_position_seconds ?? 0),
      trackMix: normalizeTrackMix(state?.track_mix),
      revision: Number(state?.revision ?? 1),
    };
  },
  async uploadScene(projectId: string, roomId: string, file: File) {
    const asset = await insertUpload({ projectId, roomId, kind: 'scene', file, fileName: file.name, contentType: file.type });
    const userId = await currentUserId();
    const { error } = await client().from('project_editor_state').upsert({
      project_id: projectId,
      room_id: roomId,
      scene_asset_id: asset.id,
      playback_position_seconds: 0,
      revision: 1,
      updated_by: userId,
    });
    if (error) throw error;
    return asset;
  },
  async updateMediaDuration(assetId: string, durationSeconds: number) {
    const { error } = await client().from('project_media_assets').update({ duration_seconds: Math.max(0, durationSeconds) }).eq('id', assetId);
    if (error) throw error;
  },
  async uploadTake(input: { projectId: string; roomId: string; label: string; blob: Blob; durationSeconds: number; startSeconds: number }) {
    const asset = await insertUpload({ projectId: input.projectId, roomId: input.roomId, kind: 'audio', file: input.blob, fileName: `${input.label || 'voice-take'}.webm`, contentType: input.blob.type || 'audio/webm' });
    const userId = await currentUserId();
    const { data, error } = await client().from('timeline_clips').insert({
      project_id: input.projectId,
      room_id: input.roomId,
      media_asset_id: asset.id,
      track_user_id: userId,
      created_by: userId,
      label: input.label.trim() || 'Untitled voice take',
      start_seconds: Math.max(0, input.startSeconds),
      source_offset_seconds: 0,
      duration_seconds: Math.max(0.1, input.durationSeconds),
    }).select('*').single();
    if (error || !data) throw error ?? new Error('The recorded take could not be saved.');
    return { ...data, audioUrl: asset.signedUrl };
  },
  async updateClip(clipId: string, patch: { startSeconds?: number; sourceOffsetSeconds?: number; durationSeconds?: number; label?: string }) {
    const { error } = await client().from('timeline_clips').update({
      ...(patch.startSeconds === undefined ? {} : { start_seconds: Math.max(0, patch.startSeconds) }),
      ...(patch.sourceOffsetSeconds === undefined ? {} : { source_offset_seconds: Math.max(0, patch.sourceOffsetSeconds) }),
      ...(patch.durationSeconds === undefined ? {} : { duration_seconds: Math.max(0.1, patch.durationSeconds) }),
      ...(patch.label === undefined ? {} : { label: patch.label.trim() || 'Untitled take' }),
    }).eq('id', clipId);
    if (error) throw error;
  },
  async splitClip(clipId: string, midpoint: number) {
    const userId = await currentUserId();
    const { data: source, error: sourceError } = await client().from('timeline_clips').select('*').eq('id', clipId).single();
    if (sourceError || !source) throw sourceError ?? new Error('The selected take is no longer available.');
    const firstDuration = Math.max(0.1, midpoint);
    const secondDuration = Math.max(0.1, source.duration_seconds - firstDuration);
    const { error: firstError } = await client().from('timeline_clips').update({ duration_seconds: firstDuration, segment_index: source.segment_index * 2, revision: source.revision + 1 }).eq('id', clipId);
    if (firstError) throw firstError;
    const { error: secondError } = await client().from('timeline_clips').insert({
      project_id: source.project_id,
      room_id: source.room_id,
      media_asset_id: source.media_asset_id,
      track_user_id: source.track_user_id,
      created_by: userId,
      label: `${source.label} · part 2`,
      start_seconds: source.start_seconds + firstDuration,
      source_offset_seconds: source.source_offset_seconds + firstDuration,
      duration_seconds: secondDuration,
      segment_index: source.segment_index * 2 + 1,
      sort_order: source.sort_order + 1,
    });
    if (secondError) throw secondError;
  },
  async deleteClip(clipId: string) {
    const { error } = await client().from('timeline_clips').delete().eq('id', clipId);
    if (error) throw error;
  },
  async saveEditorState(input: { projectId: string; roomId: string; sceneAssetId: string | null; playbackPositionSeconds: number; trackMix: TrackMixSettings; revision: number }) {
    const userId = await currentUserId();
    const { error } = await client().from('project_editor_state').upsert({
      project_id: input.projectId,
      room_id: input.roomId,
      ...(input.sceneAssetId ? { scene_asset_id: input.sceneAssetId } : {}),
      playback_position_seconds: Math.max(0, input.playbackPositionSeconds),
      track_mix: input.trackMix,
      revision: Math.max(1, input.revision + 1),
      updated_by: userId,
    });
    if (error) throw error;
  },
};
