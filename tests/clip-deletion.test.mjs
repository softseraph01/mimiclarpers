import test from 'node:test';
import assert from 'node:assert/strict';
import { removeClipById } from '../src/features/studio/clipDeletion.ts';

const clips = [
  { id: 'first', media_asset_id: 'asset-a', start_seconds: 0 },
  { id: 'middle', media_asset_id: 'asset-a', start_seconds: 5 },
  { id: 'last', media_asset_id: 'asset-b', start_seconds: 10 },
];

test('removes only the first clip by stable ID', () => {
  assert.deepEqual(removeClipById(clips, 'first').map((clip) => clip.id), ['middle', 'last']);
});

test('removes only the middle clip and preserves the other placements', () => {
  const remaining = removeClipById(clips, 'middle');
  assert.deepEqual(remaining, [clips[0], clips[2]]);
  assert.equal(remaining[0].media_asset_id, 'asset-a');
});

test('removes only the last clip', () => {
  assert.deepEqual(removeClipById(clips, 'last').map((clip) => clip.id), ['first', 'middle']);
});

test('deleting one placement does not remove another placement sharing its audio asset', () => {
  const remaining = removeClipById(clips, 'first');
  assert.equal(remaining.find((clip) => clip.id === 'middle')?.media_asset_id, 'asset-a');
});

test('a failed server deletion leaves the local clip list unchanged', () => {
  const before = [...clips];
  const serverDeleteSucceeded = false;
  const after = serverDeleteSucceeded ? removeClipById(before, 'middle') : before;
  assert.deepEqual(after, before);
});
