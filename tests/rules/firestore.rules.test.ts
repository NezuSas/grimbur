/**
 * Tests of firestore.rules against the Firestore emulator. They are not part of `npm test` (they need the emulator and Java):
 *
 *   npm run test:rules
 */
import { readFileSync } from 'fs';
import { RulesTestEnvironment, assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';

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
