import { REMINDER_HOUR, planReminder } from '../../src/core/notifications/reminderPlan';

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe('planReminder', () => {
  it('reminds this evening when the daily is still open', () => {
    const plan = planReminder(at(2026, 10, 14, 10), false, 0);
    expect(plan.at).toEqual(at(2026, 10, 14, REMINDER_HOUR));
    expect(plan.kind).toBe('daily');
  });

  it('waits for tomorrow evening when the daily is already done', () => {
    expect(planReminder(at(2026, 10, 14, 10), true, 3).at).toEqual(at(2026, 10, 15, REMINDER_HOUR));
  });

  it('waits for tomorrow evening when tonight has already passed', () => {
    expect(planReminder(at(2026, 10, 14, 21), false, 0).at).toEqual(at(2026, 10, 15, REMINDER_HOUR));
    expect(planReminder(at(2026, 10, 14, REMINDER_HOUR), false, 0).at).toEqual(at(2026, 10, 15, REMINDER_HOUR));
  });

  it('mentions the streak when there is one at stake', () => {
    const plan = planReminder(at(2026, 10, 14, 10), false, 6);
    expect(plan.kind).toBe('streak');
    expect(plan.streak).toBe(6);
  });

  it('rolls over month and year ends', () => {
    expect(planReminder(at(2026, 12, 31, 22), false, 0).at).toEqual(at(2027, 1, 1, REMINDER_HOUR));
  });

  it('never returns a time in the past', () => {
    const now = at(2026, 10, 14, 15, 30);
    expect(planReminder(now, false, 2).at.getTime()).toBeGreaterThan(now.getTime());
    expect(planReminder(now, true, 2).at.getTime()).toBeGreaterThan(now.getTime());
  });
});
