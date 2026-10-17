import { seedClips } from '../demo/seedData';
import type { TimelineEditService } from './contracts';
import type { DialogueClip } from '../types/domain';

export const localDemoTimelineEditor: TimelineEditService = {
  reset(): DialogueClip[] {
    return seedClips.map((clip) => ({ ...clip }));
  },

  move(clips, id, deltaSeconds, sceneDurationSeconds): DialogueClip[] {
    return clips.map((clip) => clip.id === id
      ? { ...clip, start: Math.max(0, Math.min(sceneDurationSeconds - clip.duration, clip.start + deltaSeconds)) }
      : clip);
  },

  trim(clips, id, deltaSeconds, sceneDurationSeconds): DialogueClip[] {
    return clips.map((clip) => clip.id === id
      ? { ...clip, duration: Math.max(1.5, Math.min(sceneDurationSeconds - clip.start, clip.duration + deltaSeconds)) }
      : clip);
  },

  split(clips, id): DialogueClip[] {
    const clip = clips.find((item) => item.id === id);
    if (!clip || clip.duration < 3) return clips;
    const midpoint = clip.duration / 2;
    return clips.flatMap((item) => item.id !== id ? [item] : [
      { ...item, id: `${item.id}-a`, duration: midpoint, transcript: `${item.transcript} · part 1` },
      { ...item, id: `${item.id}-b`, start: item.start + midpoint, duration: midpoint, transcript: `${item.transcript} · part 2` },
    ]);
  },
};
