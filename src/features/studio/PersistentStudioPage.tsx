import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, Check, ChevronLeft, ChevronRight, Clapperboard, Clock3, Download, FileVideo2, Minus, MoveLeft, Pause, Play, Plus, Scissors, Trash2, Upload, UsersRound, Volume2, Waves, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabaseRoomService } from '../../services/supabaseRooms';
import type { PersistentProject, PersistentRoom, PersistentRoomMember, DialogueClip } from '../../types/domain';
import LocalRecorder, { type RecordedClip } from './LocalRecorder';

type StudioClip = DialogueClip & { ownerId: string; sourceOffset: number; audioUrl?: string };
const PALETTE = ['cyan', 'violet', 'coral', 'amber', 'blue', 'pink'] as const;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const DEFAULT_SCENE_SECONDS = 60;
const BASE_TIMELINE_WIDTH = 900;

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
function memberColor(userId: string) {
  let hash = 0;
  for (const character of userId) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}
function waveHeights(seed: string, count = 28) {
  return Array.from({ length: count }, (_, index) => 18 + ((index * 17 + seed.length * 13) % 68));
}

export default function PersistentStudioPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<PersistentRoom | null>(null);
  const [project, setProject] = useState<PersistentProject | null>(null);
  const [members, setMembers] = useState<PersistentRoomMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sceneUrl, setSceneUrl] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [sceneMessage, setSceneMessage] = useState('');
  const [sceneDuration, setSceneDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [clips, setClips] = useState<StudioClip[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const videoElement = useRef<HTMLVideoElement>(null);
  const audioElements = useRef(new Map<string, HTMLAudioElement>());
  const sceneSeconds = sceneDuration || DEFAULT_SCENE_SECONDS;
  const selectedClip = clips.find((clip) => clip.id === selectedId) ?? null;
  const coloredMembers = useMemo(() => members.map((member) => ({ ...member, color: memberColor(member.userId) })), [members]);
  const timelineWidth = Math.round(BASE_TIMELINE_WIDTH * zoom);
  const ticks = useMemo(() => {
    const step = sceneSeconds > 120 ? 15 : sceneSeconds > 60 ? 10 : 5;
    const values: number[] = [];
    for (let tick = 0; tick < sceneSeconds; tick += step) values.push(tick);
    values.push(sceneSeconds);
    return [...new Set(values)];
  }, [sceneSeconds]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const loadedRoom = await supabaseRoomService.getRoom(roomId);
      setRoom(loadedRoom);
      if (!loadedRoom) {
        setIsMember(false);
        setProject(null);
        setMembers([]);
        return;
      }
      const membership = await supabaseRoomService.getMyMembership(roomId, user.id);
      setIsMember(Boolean(membership));
      if (!membership) {
        setProject(null);
        setMembers([]);
        return;
      }
      const [loadedProject, loadedMembers] = await Promise.all([
        supabaseRoomService.getProject(roomId),
        supabaseRoomService.listMembers(roomId),
      ]);
      setProject(loadedProject);
      setMembers(loadedMembers);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The studio could not be loaded.');
      setRoom(null);
      setProject(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => {
    if (sceneUrl) URL.revokeObjectURL(sceneUrl);
  }, [sceneUrl]);
  useEffect(() => {
    audioElements.current.forEach((audio, clipId) => {
      const clip = clips.find((item) => item.id === clipId);
      if (!clip) return;
      audio.currentTime = Math.max(0, playhead - clip.start + clip.sourceOffset);
      if (playing && playhead >= clip.start && playhead <= clip.start + clip.duration) void audio.play().catch(() => undefined);
      else audio.pause();
    });
  }, [clips, playhead, playing]);

  function setPosition(next: number) {
    const clamped = Math.max(0, Math.min(sceneSeconds, next));
    setPlayhead(clamped);
    if (videoElement.current) videoElement.current.currentTime = clamped;
  }
  function togglePlayback() {
    if (!videoElement.current) return;
    if (playing) videoElement.current.pause();
    else void videoElement.current.play().catch(() => setSceneMessage('Playback was blocked by the browser. Tap play again to start the scene.'));
  }
  function chooseScene(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) { setSceneMessage('Choose a browser-playable video file such as MP4, WebM, or OGG.'); return; }
    if (file.size > MAX_VIDEO_BYTES) { setSceneMessage('Choose a scene smaller than 250 MB for this browser-only preview.'); return; }
    if (sceneUrl) URL.revokeObjectURL(sceneUrl);
    setSceneMessage('');
    setSceneName(file.name);
    setSceneDuration(0);
    setPlayhead(0);
    setPlaying(false);
    setSceneUrl(URL.createObjectURL(file));
  }
  function addRecordedClip(recorded: RecordedClip) {
    if (!user) return;
    const start = Math.min(playhead, Math.max(0, sceneSeconds - Math.max(1, recorded.durationSeconds)));
    const duration = Math.max(1, Math.min(recorded.durationSeconds, sceneSeconds - start));
    const member = coloredMembers.find((item) => item.userId === user.id);
    const clip: StudioClip = {
      id: recorded.id,
      ownerId: user.id,
      character: member?.displayName ?? 'My take',
      initials: initials(member?.displayName ?? 'My take'),
      start,
      duration,
      sourceOffset: 0,
      transcript: recorded.label,
      color: member?.color ?? memberColor(user.id),
      audioUrl: URL.createObjectURL(recorded.blob),
    };
    setClips((current) => [...current, clip]);
    setSelectedId(clip.id);
  }
  function moveClip(delta: number) {
    if (!selectedClip) return;
    setClips((current) => current.map((clip) => clip.id === selectedClip.id ? { ...clip, start: Math.max(0, Math.min(sceneSeconds - clip.duration, clip.start + delta)) } : clip));
  }
  function trimClip(side: 'left' | 'right', delta: number) {
    if (!selectedClip) return;
    setClips((current) => current.map((clip) => {
      if (clip.id !== selectedClip.id) return clip;
      if (side === 'left') {
        const nextStart = Math.max(0, Math.min(clip.start + clip.duration - 1.5, clip.start + delta));
        const change = nextStart - clip.start;
        return { ...clip, start: nextStart, duration: clip.duration - change, sourceOffset: Math.max(0, clip.sourceOffset + change) };
      }
      return { ...clip, duration: Math.max(1.5, Math.min(sceneSeconds - clip.start, clip.duration + delta)) };
    }));
  }
  function splitClip() {
    if (!selectedClip || selectedClip.duration < 3) return;
    const midpoint = selectedClip.duration / 2;
    const first = { ...selectedClip, id: `${selectedClip.id}-a`, duration: midpoint, transcript: `${selectedClip.transcript} · part 1` };
    const second = { ...selectedClip, id: `${selectedClip.id}-b`, start: selectedClip.start + midpoint, duration: selectedClip.duration - midpoint, sourceOffset: selectedClip.sourceOffset + midpoint, transcript: `${selectedClip.transcript} · part 2` };
    setClips((current) => current.flatMap((clip) => clip.id === selectedClip.id ? [first, second] : [clip]));
    setSelectedId(first.id);
  }
  function deleteClip() {
    if (!selectedClip) return;
    if (!window.confirm(`Delete “${selectedClip.transcript}” from this local timeline?`)) return;
    if (selectedClip.audioUrl && !clips.some((clip) => clip.id !== selectedClip.id && clip.audioUrl === selectedClip.audioUrl)) URL.revokeObjectURL(selectedClip.audioUrl);
    setClips((current) => current.filter((clip) => clip.id !== selectedClip.id));
    setSelectedId('');
  }
  async function joinRoom() {
    setBusy(true);
    setError('');
    try { await supabaseRoomService.joinPublicRoom(roomId); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This room could not be joined.'); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="empty-state panel" aria-live="polite"><span className="status-dot" /> Opening the project workspace…</section>;
  if (!room) return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>Studio not available</h1><p>{error || 'This project may be private or your account may not have access.'}</p><Link className="button button--primary" to="/">Back to workspace <ArrowRight size={16} /></Link></section>;
  if (room.status === 'archived') return <section className="empty-state panel"><span className="panel-icon panel-icon--amber"><Clapperboard size={19} /></span><h1>This room is archived</h1><p>Archived rooms are read-only and cannot be opened in the studio.</p><Link className="button button--primary" to={`/room/${room.id}/lobby`}>Return to room lobby <ArrowRight size={16} /></Link></section>;

  return <div className="studio-page persistent-studio-page">
    <div className="studio-topline"><div className="studio-breadcrumb"><button className="crumb-back" type="button" onClick={() => navigate(`/room/${room.id}/lobby`)} aria-label="Back to room lobby"><ArrowLeft size={16} /></button><span className="breadcrumb"><Link to="/">WORKSPACE</Link><span className="breadcrumb__slash">/</span><Link to={`/room/${room.id}/lobby`}>ROOM</Link><span className="breadcrumb__slash">/</span><span>STUDIO</span></span></div><div className="studio-status"><span className="room-status-pill"><span className="status-dot" /> DATABASE ROOM</span><span className="studio-status__sync">{sceneUrl ? 'BROWSER SCENE LOADED' : 'WAITING FOR SCENE'}</span></div></div>
    <header className="studio-heading"><div><div className="studio-title-row"><h1>{room.name}</h1></div><p><span className="scene-chip"><Clapperboard size={13} /> {project?.title ?? 'Room project'}</span><span className="heading-divider" /><span>{room.targetLanguage} dub</span><span className="heading-divider" /><span>{members.length} participant{members.length === 1 ? '' : 's'}</span></p></div><div className="studio-heading__actions"><Link className="button button--quiet button--small" to={`/room/${room.id}/lobby`}><ChevronLeft size={14} /> Room lobby</Link><button className="button button--export button--small" type="button" disabled title="Export requires the media-rendering backend"><Download size={15} /> Export <span className="coming-soon-label">LATER</span></button></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!isMember && room.visibility === 'public' ? <section className="panel join-required-panel"><span className="panel-icon panel-icon--cyan"><Clapperboard size={19} /></span><h2>Join the room to enter its studio</h2><p>Public room details are visible, but project details are protected until you become a member.</p><button className="button button--primary" type="button" onClick={() => void joinRoom()} disabled={busy}>{busy ? 'Joining…' : 'Join this public room'} <ArrowRight size={16} /></button></section> : !isMember ? <section className="panel join-required-panel"><span className="panel-icon panel-icon--violet"><Clapperboard size={19} /></span><h2>Membership required</h2><p>Only room members can open a private project. Use the owner’s invitation link to join.</p><Link className="button button--quiet" to="/">Back to workspace</Link></section> : <>
      <section className={`studio-workbench${sceneUrl ? ' studio-workbench--loaded' : ' studio-workbench--empty'}`}>
        <aside className="studio-participants panel" aria-label="Room participants"><div className="studio-participants__heading"><span className="eyebrow">CAST / TRACKS</span><span>{members.length}</span></div><div className="studio-participants__list">{coloredMembers.map((member) => <div className="studio-participant" key={member.userId}><span className={`studio-avatar studio-avatar--${member.color}`}>{initials(member.displayName)}</span><span className="studio-participant__copy"><strong>{member.displayName}{member.userId === user?.id ? ' · you' : ''}</strong><small>{member.role === 'owner' ? 'Room owner' : 'Participant'}</small></span><span className="studio-participant__state"><i /> ready</span></div>)}{members.length === 0 && <p className="studio-participants__empty">No room members are available to display.</p>}</div><div className="studio-participants__footer"><UsersRound size={14} /> Real room membership · not sample cast</div></aside>
        {!sceneUrl ? <section className="scene-upload panel" aria-live="polite"><div className="scene-upload__signal" aria-hidden="true"><span /><span /><span /></div><span className="scene-upload__icon"><Upload size={27} /></span><span className="eyebrow">EMPTY STUDIO</span><h2>Upload a scene to begin</h2><p>Load a browser-playable video from this tablet or computer. The scene stays in this browser session until private media storage is connected.</p><input ref={fileInput} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*" className="visually-hidden" onChange={chooseScene} /><button className="button button--primary scene-upload__button" type="button" onClick={() => fileInput.current?.click()}><Upload size={17} /> Choose scene</button><span className="scene-upload__hint">MP4 · WebM · OGG · up to 250 MB</span>{sceneMessage && <p className="form-error" role="alert">{sceneMessage}</p>}</section> : <div className="studio-main">
          <section className="scene-stage panel"><div className="scene-stage__toolbar"><span className="eyebrow">SCENE PREVIEW</span><span className="scene-stage__toolbar-right"><span><Volume2 size={14} /> LOCAL MEDIA <b>{sceneDuration ? formatTime(sceneDuration) : 'LOADING'}</b></span><button className="quiet-icon-button" type="button" onClick={() => { setSceneUrl(''); setSceneName(''); setSceneMessage(''); setPlaying(false); }} aria-label="Remove local scene"><X size={15} /></button></span></div><div className="scene-canvas scene-canvas--video"><video ref={videoElement} className="local-video" src={sceneUrl} playsInline onLoadedMetadata={(event) => { setSceneDuration(event.currentTarget.duration || DEFAULT_SCENE_SECONDS); }} onTimeUpdate={(event) => setPlayhead(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPosition(0); }} aria-label="Local scene preview" /></div><div className="scene-stage__controls"><button className="play-button" type="button" onClick={togglePlayback} aria-label={playing ? 'Pause scene' : 'Play scene'}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><span className="playback-time">{formatTime(playhead)} <span>/ {formatTime(sceneSeconds)}</span></span><input className="playback-scrubber" type="range" min={0} max={sceneSeconds} step={0.05} value={Math.min(playhead, sceneSeconds)} onChange={(event) => setPosition(Number(event.target.value))} aria-label="Scene playhead position" /><span className="scene-aspect">{sceneName ? 'LOCAL' : 'SCENE'} <span>VIDEO</span></span></div>{sceneMessage && <p className="form-error" role="alert">{sceneMessage}</p>}</section>
          <LocalRecorder onClipSaved={addRecordedClip} />
          <section className="timeline-panel panel live-timeline-panel"><div className="timeline-panel__header"><div className="timeline-heading"><span className="panel-icon panel-icon--cyan"><AudioLines size={17} /></span><div><h2>Multitrack timeline</h2><p>{sceneName} · local edits only</p></div></div><div className="timeline-actions"><button className="button button--quiet button--small" type="button" onClick={() => setZoom((value) => Math.max(.65, Number((value - .15).toFixed(2))))} aria-label="Zoom timeline out"><Minus size={14} /></button><span className="timeline-zoom">{Math.round(zoom * 100)}%</span><button className="button button--quiet button--small" type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + .15).toFixed(2))))} aria-label="Zoom timeline in"><Plus size={14} /></button></div></div><p className="timeline-file-note"><FileVideo2 size={14} /> <strong>{sceneName}</strong> · video remains in this browser session and is not uploaded.</p><div className="timeline-scroll" role="region" aria-label="Scrollable multitrack timeline"><div className="timeline-grid studio-timeline-grid" style={{ '--timeline-width': `${timelineWidth}px`, '--lane-count': Math.max(1, coloredMembers.length) } as CSSProperties}><div className="timeline-scale-label"><Clock3 size={13} /> TIME</div><div className="timeline-ruler">{ticks.map((tick) => <span className="timeline-tick" key={tick} style={{ left: `${(tick / sceneSeconds) * 100}%`, transform: tick === sceneSeconds ? 'translateX(-100%)' : tick === 0 ? 'none' : 'translateX(-1px)' }}><i />{formatTime(tick)}</span>)}<div className="timeline-playhead" style={{ left: `${(playhead / sceneSeconds) * 100}%` }}><span /></div></div>{coloredMembers.map((member) => <div className="timeline-lane" key={member.userId}><div className="timeline-lane__label"><span className={`character-dot character-dot--${member.color}`} />{member.displayName}</div><div className="timeline-lane__body">{clips.filter((clip) => clip.ownerId === member.userId).map((clip) => <button key={clip.id} className={`clip-block clip-block--${clip.color}${selectedId === clip.id ? ' is-selected' : ''}`} style={{ left: `${(clip.start / sceneSeconds) * 100}%`, width: `${(clip.duration / sceneSeconds) * 100}%` }} onClick={() => { setSelectedId(clip.id); setPosition(clip.start); }} aria-label={`${clip.character} clip at ${formatTime(clip.start)}, ${clip.duration.toFixed(1)} seconds`}><span className="clip-block__handles" aria-hidden="true"><i /><i /></span><span className="clip-block__wave" aria-hidden="true">{waveHeights(clip.id).map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</span><span className="clip-block__text">{clip.transcript}</span></button>)}<div className="lane-playhead" style={{ left: `${(playhead / sceneSeconds) * 100}%` }} /></div></div>)}</div></div><div className="timeline-footer"><span><span className="status-dot" /> {clips.length} local take{clips.length === 1 ? '' : 's'} <span className="dot-separator">·</span> {members.length} participant track{members.length === 1 ? '' : 's'}</span><span>Drag-scroll · edits are browser-only</span></div></section>
          {selectedClip ? <section className="clip-editor panel"><div className="clip-editor__heading"><div><span className="eyebrow">SELECTED TAKE</span><h2>{selectedClip.character} <span>{formatTime(selectedClip.start)} · {formatTime(selectedClip.duration)}</span></h2></div><button className="icon-button" type="button" onClick={() => setSelectedId('')} aria-label="Close clip editor"><X size={16} /></button></div><p className="clip-transcript">“{selectedClip.transcript}”</p><div className="clip-edit-controls"><div className="edit-control-group"><span className="edit-control-label"><MoveLeft size={13} /> POSITION</span><button type="button" onClick={() => moveClip(-.5)} aria-label="Move selected take earlier"><ChevronLeft size={14} /> −0.5s</button><button type="button" onClick={() => moveClip(.5)} aria-label="Move selected take later">+0.5s <ChevronRight size={14} /></button></div><div className="edit-control-group"><span className="edit-control-label"><Scissors size={13} /> TRIM LEFT</span><button type="button" onClick={() => trimClip('left', -.5)} aria-label="Trim selected take from the left">−0.5s</button><button type="button" onClick={() => trimClip('left', .5)} aria-label="Extend selected take on the left">+0.5s</button></div><div className="edit-control-group"><span className="edit-control-label"><Scissors size={13} /> TRIM RIGHT</span><button type="button" onClick={() => trimClip('right', -.5)} aria-label="Trim selected take from the right">−0.5s</button><button type="button" onClick={() => trimClip('right', .5)} aria-label="Extend selected take on the right">+0.5s</button></div><div className="edit-control-group edit-control-group--split"><button type="button" onClick={splitClip} disabled={selectedClip.duration < 3}><Scissors size={14} /> Split at midpoint</button><button className="clip-delete-button" type="button" onClick={deleteClip}><Trash2 size={14} /> Delete</button></div></div></section> : <div className="timeline-empty-hint"><Waves size={15} /> Record a take to place the first clip on your participant track.</div>}
          <div className="studio-local-note"><Check size={14} /> Playback position is shared by the video and local audio in this browser. Storage upload, durable clip records, and cross-user sync are not enabled.</div>
          {clips.filter((clip) => clip.audioUrl).map((clip) => <audio key={clip.id} ref={(node) => { if (node) audioElements.current.set(clip.id, node); else audioElements.current.delete(clip.id); }} src={clip.audioUrl} preload="auto" aria-hidden="true" />)}
        </div>}
      </section>
    </>}
  </div>;
}
