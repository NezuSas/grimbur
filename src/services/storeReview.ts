import * as StoreReview from 'expo-store-review';
import { LocalStats } from '../core/stats/runStats';
import { shouldRequestReview } from '../core/stats/reviewPrompt';
import { dailyKey } from '../core/engine/seed';
import { useSettingsStore } from '../state/settings/store';

/**
 * Asks the OS for a store rating when the moment is good (see `shouldRequestReview`). The OS decides whether
 * a dialog actually appears; everything here is silent on failure, so it can never disturb the cover screen.
 */
export async function maybeRequestReview(stats: LocalStats, now: number = Date.now()): Promise<void> {
  try {
    const settings = useSettingsStore.getState();
    if (!shouldRequestReview(stats, dailyKey(), now, settings.reviewAskedAt)) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    settings.markReviewAsked(now); // recorded first: a crash in the dialog must not make us ask again tomorrow
    await StoreReview.requestReview();
  } catch {
    // unavailable or rejected: stay silent
  }
}
