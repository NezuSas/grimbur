const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  },
}));
jest.mock('../../src/services/dailyScores', () => ({ submitDailyScore: jest.fn() }));
jest.mock('../../src/services/challenges', () => ({ submitChallengeScore: jest.fn() }));

import { flushPendingSubmits, queuePendingSubmit } from '../../src/services/pendingSubmits';
import { submitDailyScore } from '../../src/services/dailyScores';
import { submitChallengeScore } from '../../src/services/challenges';

const KEY = 'grimbur.pendingSubmits.v1';
const daily = (day: string, score = 100) => ({
  kind: 'daily' as const,
  result: { day, level: 5, score, coins: 3, characterIndex: 0, time: 60 },
  name: 'Oscar',
});
const queued = () => JSON.parse(store.get(KEY) ?? '[]');

describe('pending board submissions', () => {
  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('sends the queue and empties what succeeded', async () => {
    (submitDailyScore as jest.Mock).mockResolvedValue('saved');
    await queuePendingSubmit(daily('2026-10-25'));
    await flushPendingSubmits();
    expect(submitDailyScore).toHaveBeenCalledTimes(1);
    expect(queued()).toHaveLength(0);
  });

  it('keeps what failed with a network-ish error, to try again later', async () => {
    (submitDailyScore as jest.Mock).mockRejectedValue(new Error('[daily] write timed out'));
    await queuePendingSubmit(daily('2026-10-25'));
    await flushPendingSubmits();
    expect(queued()).toHaveLength(1);
  });

  it('drops entries the server would never accept', async () => {
    (submitDailyScore as jest.Mock).mockRejectedValue(new Error('[daily] rejected name (short)'));
    await queuePendingSubmit(daily('2026-10-25'));
    await flushPendingSubmits();
    expect(queued()).toHaveLength(0);
  });

  it('keeps one entry per day, the best one', async () => {
    await queuePendingSubmit(daily('2026-10-25', 300));
    await queuePendingSubmit(daily('2026-10-25', 100)); // worse: ignored
    await queuePendingSubmit(daily('2026-10-26', 50)); // another day: kept apart
    const list = queued();
    expect(list).toHaveLength(2);
    expect(list[0].result.score).toBe(300);
  });

  it('flushes challenges through their own service', async () => {
    (submitChallengeScore as jest.Mock).mockResolvedValue('saved');
    await queuePendingSubmit({ kind: 'challenge', code: 'ABCDEFGH', result: { level: 3, score: 10, coins: 1, characterIndex: 1, time: 30 }, name: 'Oscar' });
    await flushPendingSubmits();
    expect(submitChallengeScore).toHaveBeenCalledWith('ABCDEFGH', expect.objectContaining({ score: 10 }), 'Oscar');
    expect(queued()).toHaveLength(0);
  });
});
