import type { DemoRoom, DialogueClip } from '../types/domain';

export const seedRoom: DemoRoom = {
  id: 'scene-042',
  code: 'SCN-042',
  name: 'The Last Train',
  creator: 'Ava Chen',
  visibility: 'public',
  targetLanguage: 'Spanish',
  sceneTitle: 'Platform 9 — night exterior',
  updatedLabel: 'Demo room',
  participants: [
    { id: 'p-ava', name: 'Ava Chen', initials: 'AC', color: 'cyan', role: 'host' },
    { id: 'p-noah', name: 'Noah Reed', initials: 'NR', color: 'violet', role: 'voice actor' },
    { id: 'p-lina', name: 'Lina Park', initials: 'LP', color: 'amber', role: 'voice actor' },
  ],
};

export const seedClips: DialogueClip[] = [
  { id: 'clip-1', character: 'Mara', initials: 'M', start: 2.4, duration: 5.2, transcript: 'You said the last train left at midnight.', color: 'cyan' },
  { id: 'clip-2', character: 'Eli', initials: 'E', start: 8.8, duration: 4.6, transcript: 'It did. I just never said which midnight.', color: 'violet' },
  { id: 'clip-3', character: 'Mara', initials: 'M', start: 17.2, duration: 5.4, transcript: 'Then tell me what you came back for.', color: 'cyan' },
  { id: 'clip-4', character: 'Station voice', initials: 'S', start: 25.1, duration: 4.2, transcript: 'Final boarding call for platform nine.', color: 'amber' },
];

export const demoLanguages = ['Spanish', 'Japanese', 'French', 'Korean', 'Hindi', 'Portuguese'];
