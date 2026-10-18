export function removeClipById<T extends { id: string }>(clips: T[], clipId: string): T[] {
  return clips.filter((clip) => clip.id !== clipId);
}
