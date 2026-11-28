import { describe, it, expect, beforeEach } from 'vitest';
import { db, addEntry, deleteEntry, saveClip, getClip } from '../src/db/db';
import type { Entry } from '../src/domain/types';

const entry = (p: Partial<Entry>): Entry => ({
  id: 'e', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-27', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 1, ...p,
});
const blob = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.clips.clear();
});

describe('voice proof clips', () => {
  it('stores and reads back a clip', async () => {
    const id = await saveClip(blob(), 4000);
    const c = await getClip(id);
    expect(c?.durationMs).toBe(4000);
    expect(c?.mime).toBe('audio/webm');
    expect(c?.blob).toBeDefined();
  });

  it('deleting an entry deletes its clip', async () => {
    const id = await saveClip(blob(), 1000);
    await addEntry(entry({ id: 'a', clipId: id }));
    await deleteEntry('a');
    expect(await getClip(id)).toBeUndefined();
  });

  it('a clip shared by a multi-day entry stays until the last day is deleted', async () => {
    const id = await saveClip(blob(), 1000);
    await addEntry(entry({ id: 'a', clipId: id }));
    await addEntry(entry({ id: 'b', clipId: id, date: '2026-11-26' }));
    await deleteEntry('a');
    expect(await getClip(id)).toBeDefined();
    await deleteEntry('b');
    expect(await getClip(id)).toBeUndefined();
  });

  it('existing entries without clips still work (database upgrade keeps old rows)', async () => {
    await addEntry(entry({ id: 'old' }));
    expect((await db.entries.get('old'))?.clipId).toBeUndefined();
  });
});
