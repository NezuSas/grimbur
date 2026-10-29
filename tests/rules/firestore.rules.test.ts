/**
 * Tests of firestore.rules against the Firestore emulator. They are not part of `npm test` (they need the emulator and Java):
 *
 *   npm run test:rules
 *
 * Every write requires a signed-in (anonymous) player, and a row's `pid` must be the writer's auth uid: the tests
 * write through `authed(pid)` and check that strangers can neither forge nor overwrite somebody else's row.
 */
import { readFileSync } from 'fs';
import { RulesTestEnvironment, assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { type DocumentReference, addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const good = { level: 5, score: 4200, name: 'Oscar', coins: 12, characterIndex: 2, time: 120 };
const UID = '7J2K9QXM4HT6RN3B';

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const db = () => env.unauthenticatedContext().firestore() as never;
const authed = (uid: string) => env.authenticatedContext(uid).firestore() as never;
const scores = (d: never = authed(UID)) => collection(d, 'highscores');

const mine = (uid = UID) => doc(authed(uid), 'highscores', uid);

describe('highscores: create', () => {
  it('accepts a well-formed score from a signed-in player, in the row of their own uid', async () => {
    await assertSucceeds(setDoc(mine(), good));
  });

  it('rejects a write without sign-in', async () => {
    await assertFails(setDoc(doc(db(), 'highscores', UID), good));
  });

  it("rejects rows under a random id or under somebody else's uid (one row per player)", async () => {
    await assertFails(addDoc(scores(), good));
    await assertFails(setDoc(doc(authed('VANDAL0000000000'), 'highscores', UID), good));
  });

  it.each([
    ['an extra field', { ...good, admin: true }],
    ['a missing field', { level: 5, score: 1, name: 'A', coins: 1, characterIndex: 0 }],
    ['a score above what the floors allow', { ...good, score: 5 * 20000 + 1 }],
    ['a negative score', { ...good, score: -1 }],
    ['a fractional score', { ...good, score: 10.5 }],
    ['a floor beyond 10', { ...good, level: 11 }],
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
    await assertFails(setDoc(mine(), data as never));
  });
});

describe('highscores: read, update, delete', () => {
  it('reads at most 20 rows, signed in or not', async () => {
    await assertSucceeds(getDocs(query(collection(db(), 'highscores'), orderBy('score', 'desc'), limit(20))));
    await assertFails(getDocs(query(scores(), orderBy('score', 'desc'), limit(21))));
    await assertFails(getDocs(query(scores())));
  });

  it('a player only raises their own row, never lowers it, never deletes it', async () => {
    await assertSucceeds(setDoc(mine(), good));
    await assertSucceeds(setDoc(mine(), { ...good, score: 5000 }));
    await assertFails(setDoc(mine(), { ...good, score: 4000 }));
    await assertFails(updateDoc(mine(), { score: 1 }));
    await assertFails(deleteDoc(mine()));
  });

  it("nobody edits another player's row", async () => {
    await assertSucceeds(setDoc(mine(), good));
    await assertFails(setDoc(doc(authed('VANDAL0000000000'), 'highscores', UID), { ...good, score: 99999 }));
  });
});

describe('everything else is closed', () => {
  it('refuses other collections', async () => {
    await assertFails(setDoc(doc(authed(UID), 'users', 'a'), { x: 1 }));
    await assertFails(getDocs(collection(db(), 'users')));
  });
});

describe('cloud backups', () => {
  const KEY = '7J2K9QXM4HT6RN3B';
  const code = 'WA1.' + 'abcDEF012_-'.repeat(20) + '.abc123';
  const backup = (k: string) => doc(db(), 'backups', k);
  const body = () => ({ code, updatedAt: serverTimestamp() });

  it('the key holder can write, read, overwrite and delete the document (no sign-in needed: the key is the capability)', async () => {
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
  const pid = UID;
  const dayKey = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
  const today = dayKey(0);
  const entry = (patch: Record<string, unknown> = {}) => ({ day: today, pid, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200, ...patch });
  const entryRef = (day = today, p = pid, asUid = p) => doc(authed(asUid), 'daily_scores', `${day}_${p}`);

  it('accepts a result for today, yesterday and tomorrow (local days differ from the server day)', async () => {
    await assertSucceeds(setDoc(entryRef(dayKey(0)), entry({ day: dayKey(0) })));
    await assertSucceeds(setDoc(entryRef(dayKey(-1), 'AAAAAAAAAAAAAAAA'), entry({ day: dayKey(-1), pid: 'AAAAAAAAAAAAAAAA' })));
    await assertSucceeds(setDoc(entryRef(dayKey(1), 'BBBBBBBBBBBBBBBB'), entry({ day: dayKey(1), pid: 'BBBBBBBBBBBBBBBB' })));
  });

  it('accepts a real anonymous-auth uid (28 alphanumeric characters) as pid', async () => {
    const uid = 'aB3dE5fG7hJ9kL1mN3pQ5rS7tU9v';
    await assertSucceeds(setDoc(doc(authed(uid), 'daily_scores', `${today}_${uid}`), entry({ pid: uid })));
  });

  it('only raises a score, never lowers it, never deletes', async () => {
    await assertSucceeds(setDoc(entryRef(), entry()));
    await assertSucceeds(setDoc(entryRef(), entry({ score: 5000 })));
    await assertFails(setDoc(entryRef(), entry({ score: 4000 })));
    await assertFails(deleteDoc(entryRef()));
  });

  it('refuses a write without sign-in', async () => {
    await assertFails(setDoc(doc(db(), 'daily_scores', `${today}_${pid}`), entry()));
  });

  it("refuses creating a row under somebody else's pid", async () => {
    await assertFails(setDoc(doc(authed('VANDAL0000000000'), 'daily_scores', `${today}_${pid}`), entry()));
  });

  it("refuses rewriting somebody else's row, even with a higher score and their own name kept", async () => {
    await assertSucceeds(setDoc(entryRef(), entry()));
    await assertFails(setDoc(doc(authed('VANDAL0000000000'), 'daily_scores', `${today}_${pid}`), entry({ score: 999999 % (6 * 20000), name: 'Vandal' })));
  });

  const bad: [string, Record<string, unknown>, string?][] = [
    ['a day far from today', { day: '2020-01-01' }],
    ['a document id that does not match', {}, 'wrong-id'],
    ['a week field (the weekly board reads the days)', { week: '2026-W42' }],
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
    const target = doc(authed(owner), 'daily_scores', id ?? `${day}_${owner}`);
    await assertFails(setDoc(target, entry({ pid: owner, ...patch })));
  });

  it('lists at most 20 rows of a day or a week, and reads one document, without sign-in', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'daily_scores', `${today}_${pid}`), entry());
    });
    const col = collection(db(), 'daily_scores');
    await assertSucceeds(getDocs(query(col, where('day', '==', today), orderBy('score', 'desc'), limit(20))));
    await assertSucceeds(getDocs(query(col, where('day', 'in', [dayKey(-1), today, dayKey(1)]), orderBy('score', 'desc'), limit(20))));
    await assertFails(getDocs(query(col, where('day', '==', today), orderBy('score', 'desc'), limit(21))));
    await assertFails(getDocs(query(col)));
    await assertSucceeds(getDoc(doc(db(), 'daily_scores', `${today}_${pid}`)));
  });
});

describe('crash reports', () => {
  const report = (patch: Record<string, unknown> = {}) => ({
    message: 'TypeError: x is not a function',
    stack: 'at GameScreen...',
    context: 'fatal',
    version: '1.2.0',
    platform: 'android 14',
    at: Date.now(),
    receivedAt: serverTimestamp(),
    ...patch,
  });

  it('a signed-in app may add one; nobody reads, edits or lists them', async () => {
    await assertSucceeds(addDoc(collection(authed(UID), 'crashes'), report()));
    await assertFails(addDoc(collection(db(), 'crashes'), report()));
    await assertFails(getDocs(collection(authed(UID), 'crashes')));
  });

  it.each([
    ['an empty message', { message: '' }],
    ['a message beyond 4000 characters', { message: 'x'.repeat(4001) }],
    ['an extra field', { admin: true }],
    ['a made-up server time', { receivedAt: new Date('2020-01-01') }],
  ])('rejects %s', async (_label, patch) => {
    await assertFails(addDoc(collection(authed(UID), 'crashes'), report(patch)));
  });
});

describe('the developer notice', () => {
  it('is readable by everyone and writable by nobody', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'config', 'live'), { id: 'a', en: 'Hello' });
    });
    await assertSucceeds(getDoc(doc(db(), 'config', 'live')));
    await assertSucceeds(getDoc(doc(db(), 'config', 'app')));
    await assertFails(setDoc(doc(authed(UID), 'config', 'live'), { id: 'b', en: 'Hacked' }));
    await assertFails(getDoc(doc(db(), 'config', 'other')));
    await assertFails(getDocs(collection(db(), 'config')));
  });
});

describe('friend challenges', () => {
  const pid = UID;
  const code = 'ABCD2345';
  const entry = (patch: Record<string, unknown> = {}) => ({ code, pid, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200, ...patch });
  const ref = (c = code, p = pid) => doc(authed(p), 'challenge_scores', `${c}_${p}`);

  it('accepts a result, then only a better one; never deletes', async () => {
    await assertSucceeds(setDoc(ref(), entry()));
    await assertSucceeds(setDoc(ref(), entry({ score: 5000 })));
    await assertFails(setDoc(ref(), entry({ score: 100 })));
    await assertFails(deleteDoc(ref()));
  });

  it('refuses a write without sign-in, or under another pid', async () => {
    await assertFails(setDoc(doc(db(), 'challenge_scores', `${code}_${pid}`), entry()));
    await assertFails(setDoc(doc(authed('VANDAL0000000000'), 'challenge_scores', `${code}_${pid}`), entry()));
  });

  it("refuses rewriting somebody else's result", async () => {
    await assertSucceeds(setDoc(ref(), entry()));
    await assertFails(setDoc(doc(authed('VANDAL0000000000'), 'challenge_scores', `${code}_${pid}`), entry({ score: 100000, name: 'Vandal' })));
  });

  const bad: [string, Record<string, unknown>][] = [
    ['a bad code', { code: 'abc' }],
    ['a bad player id', { pid: 'short' }],
    ['a floor beyond 10', { level: 11, score: 100, coins: 1, time: 100 }],
    ['a score above what the floors allow', { score: 6 * 20000 + 1 }],
    ['a run too fast for its floors', { level: 10, score: 100, coins: 1, time: 3 }],
    ['an extra field', { admin: true }],
    ['a link in the name', { name: 'see www.x.com' }],
  ];
  it.each(bad.map(([label, patch], i) => [label, patch, i] as [string, Record<string, unknown>, number]))('rejects %s', async (_label, patch, i) => {
    const owner = (patch.pid as string | undefined) ?? `E${String(i).padStart(15, '0')}`;
    const c = (patch.code as string | undefined) ?? code;
    await assertFails(setDoc(doc(authed(owner), 'challenge_scores', `${c}_${owner}`), entry({ pid: owner, ...patch })));
  });

  it('a document id that does not match is refused', async () => {
    await assertFails(setDoc(doc(authed(pid), 'challenge_scores', 'whatever'), entry()));
  });

  it('lists at most 20 rows of a code, and reads one document, without sign-in', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'challenge_scores', `${code}_${pid}`), entry());
    });
    const col = collection(db(), 'challenge_scores');
    await assertSucceeds(getDocs(query(col, where('code', '==', code), orderBy('score', 'desc'), limit(20))));
    await assertFails(getDocs(query(col, where('code', '==', code), orderBy('score', 'desc'), limit(21))));
    await assertFails(getDocs(query(col)));
    await assertSucceeds(getDoc(doc(db(), 'challenge_scores', `${code}_${pid}`)));
  });
});

describe('live duels', () => {
  const pid = UID;
  const code = 'ABCD2345';
  // A lobby write stamps `startedAt`; once the run starts the app merges its writes and leaves it alone (`run`).
  const entry = (patch: Record<string, unknown> = {}) => ({ code, pid, name: 'Oscar', characterIndex: 1, state: 'lobby', level: 1, score: 0, victory: false, time: 0, stake: 0, startedAt: serverTimestamp(), updatedAt: serverTimestamp(), ...patch });
  const run = (patch: Record<string, unknown>) => {
    const { startedAt: _ignored, ...rest } = entry(patch);
    return rest;
  };
  const merge = (r: DocumentReference, data: Record<string, unknown>) => setDoc(r, data, { merge: true });
  /** The room of a code, with its stake, written by the creator. */
  const openRoom = async (c = code, stake = 0) => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'duels', c), { code: c, host: pid, stake, createdAt: new Date() });
    });
  };
  /** This player's document as it is `secondsAgo` after the start (written with the rules off: the emulator cannot wait). */
  const startedAgo = async (secondsAgo: number, patch: Record<string, unknown> = {}) => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'duel_players', `${code}_${pid}`), { ...run({ state: 'playing' }), startedAt: new Date(Date.now() - secondsAgo * 1000), updatedAt: new Date(), ...patch });
    });
  };
  beforeEach(async () => openRoom());
  const ref = (c = code, p = pid) => doc(authed(p), 'duel_players', `${c}_${p}`);

  it('a player joins, gets ready, starts and keeps updating their own state', async () => {
    await assertSucceeds(merge(ref(), entry()));
    await assertSucceeds(merge(ref(), entry({ state: 'ready' })));
    await assertSucceeds(merge(ref(), entry({ state: 'lobby' }))); // "not ready any more"
    await assertSucceeds(merge(ref(), run({ state: 'playing' })));
    await startedAgo(60, { level: 2, score: 300 });
    await assertSucceeds(merge(ref(), run({ state: 'playing', level: 3, score: 1200 })));
    await assertSucceeds(merge(ref(), run({ state: 'done', level: 4, score: 2000, time: 300 })));
    await assertFails(deleteDoc(ref()));
  });

  it('enters the room in the lobby, never straight into a run', async () => {
    const other = 'H000000000000000';
    await assertFails(merge(doc(authed(other), 'duel_players', `${code}_${other}`), entry({ pid: other, state: 'playing' })));
    await assertFails(merge(doc(authed(other), 'duel_players', `${code}_${other}`), entry({ pid: other, state: 'done', level: 10, score: 5000, victory: true })));
  });

  it('a state never goes back, floor and score never go down, and done is final', async () => {
    await startedAgo(60, { level: 3, score: 900 });
    await assertFails(merge(ref(), entry({ state: 'lobby' })));
    await assertFails(merge(ref(), run({ state: 'playing', level: 2, score: 900 })));
    await assertFails(merge(ref(), run({ state: 'playing', level: 3, score: 800 })));
    await assertSucceeds(merge(ref(), run({ state: 'done', level: 3, score: 900, time: 60 })));
    await assertSucceeds(merge(ref(), run({ state: 'done', level: 3, score: 900, time: 60 }))); // the retry of the same end
    await assertFails(merge(ref(), run({ state: 'done', level: 4, score: 1500, time: 70 })));
    await assertFails(merge(ref(), run({ state: 'playing', level: 3, score: 900 })));
  });

  it('refuses a floor there was no time to reach, and a victory before the last floor', async () => {
    await startedAgo(10);
    await assertFails(merge(ref(), run({ state: 'playing', level: 10, score: 1000 })));
    await assertFails(merge(ref(), run({ state: 'done', level: 2, score: 100, victory: true, time: 10 })));
    await assertSucceeds(merge(ref(), run({ state: 'playing', level: 2, score: 100 })));
  });

  it('the start time cannot be moved once the run has begun', async () => {
    await startedAgo(60);
    await assertFails(merge(ref(), entry({ state: 'playing', level: 2, score: 100 })));
  });

  it('a player in the lobby has played nothing', async () => {
    await assertFails(merge(ref(), entry({ level: 5, score: 1000 })));
    await assertFails(merge(ref(), entry({ state: 'ready', victory: true })));
  });

  it("refuses a write without sign-in, and sabotaging a rival's document", async () => {
    await assertSucceeds(merge(ref(), entry()));
    await assertFails(setDoc(doc(db(), 'duel_players', `${code}_${pid}`), entry({ state: 'done' })));
    // The classic grief: writing `done` with a losing score into the rival's document.
    await assertFails(setDoc(doc(authed('VANDAL0000000000'), 'duel_players', `${code}_${pid}`), entry({ state: 'done', level: 1, score: 0, time: 1 })));
  });

  const bad: [string, Record<string, unknown>][] = [
    ['an unknown state', { state: 'winner' }],
    ['a bad code', { code: 'abc' }],
    ['a bad player id', { pid: 'short' }],
    ['a floor beyond 10', { level: 11, score: 100 }],
    ['a score above what the floors allow', { score: 20001 }],
    ['an unknown hero', { characterIndex: 6 }],
    ['a made-up time of day', { updatedAt: new Date('2020-01-01') }],
    ['an extra field', { admin: true }],
    ['a stake above 100000', { stake: 100001 }],
    ['a negative stake', { stake: -1 }],
    ['a link in the name', { name: 'see www.x.com' }],
  ];
  it.each(bad.map(([label, patch], i) => [label, patch, i] as [string, Record<string, unknown>, number]))('rejects %s', async (_label, patch, i) => {
    const owner = (patch.pid as string | undefined) ?? `F${String(i).padStart(15, '0')}`;
    const c = (patch.code as string | undefined) ?? code;
    await assertFails(setDoc(doc(authed(owner), 'duel_players', `${c}_${owner}`), entry({ pid: owner, ...patch })));
  });

  it("every player plays for the room's stake: nobody who joins can raise it", async () => {
    const big = 'BCDF2345';
    await openRoom(big, 50);
    const owner = `G${'0'.repeat(14)}K`;
    const r = doc(authed(owner), 'duel_players', `${big}_${owner}`);
    await assertFails(setDoc(r, entry({ code: big, pid: owner, stake: 5000 })));
    await assertSucceeds(setDoc(r, entry({ code: big, pid: owner, stake: 50 })));
    await assertFails(setDoc(r, entry({ code: big, pid: owner, stake: 100000, state: 'ready' })));
  });

  it('a room without its stake document cannot be joined', async () => {
    const owner = `J${'0'.repeat(15)}`;
    await assertFails(setDoc(doc(authed(owner), 'duel_players', `NRRM2345_${owner}`), entry({ code: 'NRRM2345', pid: owner })));
  });

  it('the room is written once by its creator and never changed', async () => {
    const c = 'NEWR2345';
    const room = (patch: Record<string, unknown> = {}) => ({ code: c, host: pid, stake: 100, createdAt: serverTimestamp(), ...patch });
    await assertFails(setDoc(doc(db(), 'duels', c), room()));
    await assertFails(setDoc(doc(authed(pid), 'duels', c), room({ host: 'VANDAL0000000000' })));
    await assertFails(setDoc(doc(authed(pid), 'duels', c), room({ stake: 100001 })));
    await assertSucceeds(setDoc(doc(authed(pid), 'duels', c), room()));
    await assertSucceeds(getDoc(doc(db(), 'duels', c)));
    await assertFails(setDoc(doc(authed(pid), 'duels', c), room({ stake: 1 })));
    await assertFails(deleteDoc(doc(authed(pid), 'duels', c)));
    await assertFails(getDocs(collection(db(), 'duels')));
  });

  it('a document id that does not match is refused', async () => {
    await assertFails(setDoc(doc(authed(pid), 'duel_players', 'whatever'), entry()));
  });

  it('lists at most 4 rows of a room and reads single documents, without sign-in', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'duel_players', `${code}_${pid}`), { ...entry(), startedAt: new Date(), updatedAt: new Date() });
    });
    const col = collection(db(), 'duel_players');
    await assertSucceeds(getDocs(query(col, where('code', '==', code), limit(4))));
    await assertFails(getDocs(query(col, where('code', '==', code), limit(5))));
    await assertFails(getDocs(query(col)));
    await assertSucceeds(getDoc(doc(db(), 'duel_players', `${code}_${pid}`)));
  });
});

describe('player looks (frame and title)', () => {
  const look = { frame: 'frame_gold', title: 'title_slayer' };

  it('a score row may carry a frame and a title, or just one, or neither', async () => {
    await assertSucceeds(setDoc(mine(), { ...good, ...look }));
    await assertSucceeds(setDoc(mine('AAAAAAAAAAAAAAAA'), { ...good, frame: 'frame_bronze' }));
    await assertSucceeds(setDoc(mine('BBBBBBBBBBBBBBBB'), good));
  });

  it.each([
    ['a frame that is not a frame id', { frame: 'title_slayer' }],
    ['a title that is not a title id', { title: 'frame_gold' }],
    ['a frame with odd characters', { frame: 'frame_<script>' }],
    ['a frame that is not text', { frame: 7 }],
    ['an overlong title', { title: 'title_' + 'x'.repeat(20) }],
  ])('rejects %s', async (_label, patch) => {
    await assertFails(setDoc(mine(), { ...good, ...patch } as never));
  });

  it('daily, challenge and duel rows accept the look too', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await assertSucceeds(setDoc(doc(authed(UID), 'daily_scores', `${today}_${UID}`), { day: today, pid: UID, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200, ...look }));
    await assertSucceeds(setDoc(doc(authed(UID), 'challenge_scores', `ABCD2345_${UID}`), { code: 'ABCD2345', pid: UID, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200, ...look }));
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'duels', 'ABCD2345'), { code: 'ABCD2345', host: UID, stake: 0, createdAt: new Date() });
    });
    await assertSucceeds(
      setDoc(
        doc(authed(UID), 'duel_players', `ABCD2345_${UID}`),
        { code: 'ABCD2345', pid: UID, name: 'Oscar', characterIndex: 1, state: 'lobby', level: 1, score: 0, victory: false, time: 0, stake: 0, startedAt: serverTimestamp(), updatedAt: serverTimestamp(), ...look },
        { merge: true },
      ),
    );
    await assertFails(setDoc(doc(authed(UID), 'challenge_scores', `ABCD2346_${UID}`), { code: 'ABCD2346', pid: UID, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200, frame: 'crown!' }));
  });
});
