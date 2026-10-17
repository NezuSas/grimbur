/**
 * Tests of firestore.rules against the Firestore emulator. They are not part of `npm test` (they need the emulator and Java):
 *
 *   npm run test:rules
 */
import { readFileSync } from 'fs';
import { RulesTestEnvironment, assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const good = { level: 5, score: 4200, name: 'Oscar', coins: 12, characterIndex: 2, time: 120 };

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const db = () => env.unauthenticatedContext().firestore() as never;
const scores = () => collection(db(), 'highscores');

describe('highscores: create', () => {
  it('accepts a well-formed score', async () => {
    await assertSucceeds(addDoc(scores(), good));
  });

  it.each([
    ['an extra field', { ...good, admin: true }],
    ['a missing field', { level: 5, score: 1, name: 'A', coins: 1, characterIndex: 0 }],
    ['a score above what the floors allow', { ...good, score: 5 * 20000 + 1 }],
    ['a negative score', { ...good, score: -1 }],
    ['a fractional score', { ...good, score: 10.5 }],
    ['a floor beyond 12', { ...good, level: 13 }],
    ['too many gems', { ...good, coins: 5 * 8 + 1 }],
    ['an unknown hero', { ...good, characterIndex: 6 }],
    ['a run too fast for its floors', { ...good, level: 10, score: 100, coins: 1, time: 3 }],
    ['an empty name', { ...good, name: '' }],
    ['only spaces', { ...good, name: '   ' }],
    ['a name of 21 characters', { ...good, name: 'x'.repeat(21) }],
    ['a link in the name', { ...good, name: 'visit www.x.com' }],
    ['a direction-changing character in the name', { ...good, name: 'ab‮cd' }],
    ['a number as name', { ...good, name: 5 }],
  ])('rejects %s', async (_label, data) => {
    await assertFails(addDoc(scores(), data as never));
  });
});

describe('highscores: read, update, delete', () => {
  it('reads at most 20 rows', async () => {
    await assertSucceeds(getDocs(query(scores(), orderBy('score', 'desc'), limit(20))));
    await assertFails(getDocs(query(scores(), orderBy('score', 'desc'), limit(21))));
    await assertFails(getDocs(query(scores())));
  });

  it('never edits or deletes a row', async () => {
    let id = '';
    await env.withSecurityRulesDisabled(async ctx => {
      const ref = await addDoc(collection(ctx.firestore(), 'highscores'), good);
      id = ref.id;
    });
    await assertFails(updateDoc(doc(db(), 'highscores', id), { score: 1 }));
    await assertFails(deleteDoc(doc(db(), 'highscores', id)));
  });
});

describe('everything else is closed', () => {
  it('refuses other collections', async () => {
    await assertFails(setDoc(doc(db(), 'users', 'a'), { x: 1 }));
    await assertFails(getDocs(collection(db(), 'users')));
  });
});

describe('cloud backups', () => {
  const KEY = '7J2K9QXM4HT6RN3B';
  const code = 'WA1.' + 'abcDEF012_-'.repeat(20) + '.abc123';
  const backup = (k: string) => doc(db(), 'backups', k);
  const body = () => ({ code, updatedAt: serverTimestamp() });

  it('the key holder can write, read, overwrite and delete the document', async () => {
    await assertSucceeds(setDoc(backup(KEY), body()));
    await assertSucceeds(getDoc(backup(KEY)));
    await assertSucceeds(setDoc(backup(KEY), body()));
    await assertSucceeds(deleteDoc(backup(KEY)));
  });

  it('nobody lists backups', async () => {
    await assertFails(getDocs(collection(db(), 'backups')));
    await assertFails(getDocs(query(collection(db(), 'backups'), limit(5))));
  });

  it.each([
    ['a key that is too short', 'ABC123', body()],
    ['a key with forbidden letters (I, L, O, U)', 'ILOUILOUILOUILOU', body()],
    ['a lower-case key', '7j2k9qxm4ht6rn3b', body()],
    ['an extra field', KEY, { ...body(), admin: true }],
    ['a code that is not a backup', KEY, { code: 'hello world, I am not a backup code', updatedAt: serverTimestamp() }],
    ['a code too short', KEY, { code: 'WA1.x', updatedAt: serverTimestamp() }],
    ['a code beyond 30000 characters', KEY, { code: 'WA1.' + 'a'.repeat(30001), updatedAt: serverTimestamp() }],
    ['a made-up time', KEY, { code, updatedAt: new Date('2020-01-01') }],
  ])('rejects %s', async (_label, key, data) => {
    await assertFails(setDoc(backup(key as string), data as never));
  });
});

describe('daily and weekly scores', () => {
  const pid = '7J2K9QXM4HT6RN3B';
  const dayKey = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
  const today = dayKey(0);
  const entry = (patch: Record<string, unknown> = {}) => ({ day: today, week: '2026-W42', pid, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200, ...patch });
  const entryRef = (day = today, p = pid) => doc(db(), 'daily_scores', `${day}_${p}`);

  it('accepts a result for today, yesterday and tomorrow (local days differ from the server day)', async () => {
    await assertSucceeds(setDoc(entryRef(dayKey(0)), entry({ day: dayKey(0) })));
    await assertSucceeds(setDoc(entryRef(dayKey(-1), 'AAAAAAAAAAAAAAAA'), entry({ day: dayKey(-1), pid: 'AAAAAAAAAAAAAAAA' })));
    await assertSucceeds(setDoc(entryRef(dayKey(1), 'BBBBBBBBBBBBBBBB'), entry({ day: dayKey(1), pid: 'BBBBBBBBBBBBBBBB' })));
  });

  it('only raises a score, never lowers it, never deletes', async () => {
    await assertSucceeds(setDoc(entryRef(), entry()));
    await assertSucceeds(setDoc(entryRef(), entry({ score: 5000 })));
    await assertFails(setDoc(entryRef(), entry({ score: 4000 })));
    await assertFails(deleteDoc(entryRef()));
  });

  const bad: [string, Record<string, unknown>, string?][] = [
    ['a day far from today', { day: '2020-01-01' }],
    ['a document id that does not match', {}, 'wrong-id'],
    ['a made-up week', { week: 'week 42' }],
    ['a bad player id', { pid: 'short' }],
    ['a floor beyond 10', { level: 11, score: 100, coins: 1, time: 100 }],
    ['a score above what the floors allow', { score: 6 * 20000 + 1 }],
    ['a run too fast for its floors', { level: 10, score: 100, coins: 1, time: 3 }],
    ['an extra field', { admin: true }],
    ['a link in the name', { name: 'see www.x.com' }],
  ];
  // Each case writes its own document (the test client keeps writes to one path in a queue).
  it.each(bad.map(([label, patch, id], i) => [label, patch, id ?? null, i] as [string, Record<string, unknown>, string | null, number]))('rejects %s', async (_label, patch, id, i) => {
    const owner = (patch.pid as string | undefined) ?? `D${String(i).padStart(15, '0')}`;
    const day = (patch.day as string | undefined) ?? today;
    const target = doc(db(), 'daily_scores', id ?? `${day}_${owner}`);
    await assertFails(setDoc(target, entry({ pid: owner, ...patch })));
  });

  it('lists at most 20 rows of a day or a week, and reads one document', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'daily_scores', `${today}_${pid}`), entry());
    });
    const col = collection(db(), 'daily_scores');
    await assertSucceeds(getDocs(query(col, where('day', '==', today), orderBy('score', 'desc'), limit(20))));
    await assertSucceeds(getDocs(query(col, where('week', '==', '2026-W42'), orderBy('score', 'desc'), limit(20))));
    await assertFails(getDocs(query(col, where('day', '==', today), orderBy('score', 'desc'), limit(21))));
    await assertFails(getDocs(query(col)));
    await assertSucceeds(getDoc(entryRef()));
  });
});

describe('the developer notice', () => {
  it('is readable by everyone and writable by nobody', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'config', 'live'), { id: 'a', en: 'Hello' });
    });
    await assertSucceeds(getDoc(doc(db(), 'config', 'live')));
    await assertFails(setDoc(doc(db(), 'config', 'live'), { id: 'b', en: 'Hacked' }));
    await assertFails(getDoc(doc(db(), 'config', 'other')));
    await assertFails(getDocs(collection(db(), 'config')));
  });
});
