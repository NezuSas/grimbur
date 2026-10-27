import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { planReminder } from '../core/notifications/reminderPlan';
import { dailyKey } from '../core/engine/seed';
import { translateNow } from '../i18n/useT';
import { useSettingsStore } from '../state/settings/store';
import { currentStreak } from '../core/stats/runStats';
import type { LocalStats } from '../core/stats/runStats';

/**
 * The optional daily-challenge reminder (Settings > Accessibility... "Daily reminder"). It is a local notification scheduled
 * on the phone: nothing is sent to any server. Only one is ever scheduled (see core/notifications/reminderPlan.ts), and it is
 * replanned whenever the cover opens, so a played daily moves it to the next evening.
 *
 * Every call is wrapped: a phone (or Expo Go) without notification support just has no reminders and never crashes the game.
 */
type Notifications = typeof import('expo-notifications');

const CHANNEL = 'daily-reminder';

/**
 * Expo Go does not ship the notifications module (loading it raises an error screen), so reminders exist only in the real app
 * (the installed build). The Settings row is hidden where they are not supported. Expo Go is told the way expo-notifications
 * itself tells it (its native module is there): recent SDKs leave `appOwnership` unset in Expo Go, which let the module
 * load and fail.
 */
const inExpoGo = (): boolean => isRunningInExpoGo() || Constants.appOwnership === 'expo';
export const remindersSupported = (): boolean => Platform.OS !== 'web' && !inExpoGo();

function load(): Notifications | null {
  if (!remindersSupported()) return null;
  try {
     
    return require('expo-notifications') as Notifications;
  } catch {
    return null;
  }
}

async function ensureChannel(N: Notifications) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CHANNEL, {
    name: 'Daily challenge',
    importance: N.AndroidImportance.DEFAULT,
  });
}

/** Asks the phone for permission to show notifications; true when it is granted. */
export async function requestReminderPermission(): Promise<boolean> {
  const N = load();
  if (!N) return false;
  try {
    await ensureChannel(N);
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await N.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Removes every scheduled reminder. */
export async function cancelReminders(): Promise<void> {
  const N = load();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* nothing to cancel */
  }
}

/** Every reminder change runs one at a time: two overlapping syncs (the cover and the Settings switch) once scheduled it twice. */
let queue: Promise<unknown> = Promise.resolve();

/** Plans the next reminder from the current stats (or removes it when reminders are off). Never throws. */
export function syncReminders(stats: LocalStats, now: Date = new Date()): Promise<void> {
  const run = queue.then(() => syncNow(stats, now));
  queue = run.catch(() => undefined);
  return run;
}

async function syncNow(stats: LocalStats, now: Date): Promise<void> {
  const N = load();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (!useSettingsStore.getState().remindersEnabled) return;
    const permission = await N.getPermissionsAsync();
    if (!permission.granted) {
      // Permission was taken away in the phone's settings (or a restored backup had the switch on): show it as off.
      useSettingsStore.getState().setRemindersEnabled(false);
      return;
    }
    await ensureChannel(N);
    const dailyDone = stats.daily?.date === dailyKey(now);
    // The streak that will still be alive when the reminder fires (a streak already lost is not mentioned)
    const probe = planReminder(now, dailyDone, 0);
    const plan = planReminder(now, dailyDone, currentStreak(stats, dailyKey(probe.at)));
    await N.scheduleNotificationAsync({
      content:
        plan.kind === 'streak'
          ? { title: translateNow('reminder.streak.title', { count: plan.streak }), body: translateNow('reminder.streak.body') }
          : { title: translateNow('reminder.daily.title'), body: translateNow('reminder.daily.body') },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: plan.at, channelId: CHANNEL },
    });
  } catch (e) {
    console.warn('[Reminders] could not schedule', e);
  }
}
