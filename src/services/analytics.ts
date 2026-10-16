/**
 * Analytics + crash reporting facade.
 *
 * The game only talks to this module, never to a vendor SDK. To ship real
 * analytics (e.g. Firebase Analytics + Crashlytics through
 * @react-native-firebase, which needs a development build), implement
 * `AnalyticsProvider` and call `setAnalyticsProvider` once at startup.
 */

type Params = Record<string, string | number | boolean>;

/** Every event the game reports, with the parameters it must carry. */
export interface AnalyticsEvents {
  game_start: { mode: 'expedition' | 'daily' | 'endless'; character: number };
  level_complete: { level: number; score: number; time: number };
  game_over: { level: number; score: number; time: number; cause: string };
  revived: { level: number; score: number; price: number };
  arrows_bought: { level: number; price: number };
  powerup_collected: { kind: 'shield' | 'ammo' };
  trap_triggered: { level: number };
  high_score_submitted: { level: number; score: number };
  screen_view: { screen: string };
  daily_shared: { score: number };
  run_shared: { score: number };
  relic_picked: { relic: string; floor: number };
  expedition_won: { score: number; time: number; character: number; mode: string };
  /** A cold start of the app (the funnel's first step). */
  app_open: { cold: boolean };
  /** The guided first-floor tutorial: finished, or left early (`step` = steps completed so far). */
  tutorial_complete: { replay: boolean };
  tutorial_skip: { step: number };
  lesson_complete: { lesson: string };
  forge_purchase: { upgrade: string; level: number; cost: number };
  /** `source`: where the paywall was opened from (cover, floor, demo, endless). */
  paywall_view: { source: string };
  paywall_purchase_started: { source: string };
  paywall_purchase_succeeded: { source: string };
  paywall_purchase_failed: { source: string; reason: string };
  paywall_restore: { source: string; result: string };
  paywall_dismiss: { source: string };
}

export interface AnalyticsProvider {
  track(name: string, params?: Params): void;
  recordError(error: Error, context?: string): void;
}

const consoleProvider: AnalyticsProvider = {
  track: (name, params) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[Analytics] ${name}`, params ?? '');
  },
  recordError: (error, context) => {
    console.warn(`[Analytics] error${context ? ` (${context})` : ''}:`, error);
  },
};

let provider: AnalyticsProvider = consoleProvider;

export function setAnalyticsProvider(next: AnalyticsProvider): void {
  provider = next;
}

export const analytics = {
  track<K extends keyof AnalyticsEvents>(name: K, params: AnalyticsEvents[K]): void {
    try {
      provider.track(name, params);
    } catch {
      // Analytics must never break gameplay.
    }
  },

  recordError(error: unknown, context?: string): void {
    const err = error instanceof Error ? error : new Error(String(error));
    try {
      provider.recordError(err, context);
    } catch {
      // Same: never throw from the error path.
    }
  },
};

/**
 * Reports uncaught JS errors, then defers to the previously installed handler
 * (so React Native's red box / crash behaviour is unchanged).
 */
export function installGlobalErrorHandler(): void {
  const errorUtils = (globalThis as { ErrorUtils?: {
    getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
    setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
  } }).ErrorUtils;
  if (!errorUtils) return;

  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    analytics.recordError(error, isFatal ? 'fatal' : 'non-fatal');
    previous(error, isFatal);
  });
}
