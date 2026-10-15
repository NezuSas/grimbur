import { Platform } from "react-native";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { dailyKey } from "../core/engine/seed";
import { setMonetizationOverride } from "../services/entitlements";

/**
 * Development-only helper for the web build: open any screen directly, with a stats preset, so every screen can be
 * checked at any window size (see scripts/screenshots.ps1).
 *
 *   http://localhost:8081/?screen=ForgeScreen&preset=veteran&lang=en
 *   ?params={"mode":"daily"}  extra route params as JSON
 *
 * It never runs in a production bundle or on a device.
 */

const STATS_KEY = "wumpus.stats.v1";
const SETTINGS_KEY = "wumpus-adventures-settings";
const ENTITLEMENTS_KEY = "wumpus-adventures-entitlements";

const today = dailyKey();

const PRESETS: Record<string, Partial<LocalStats>> = {
  new: {},
  returning: { gamesPlayed: 3, bestScore: 1800, bestLevel: 3, totalGems: 40, embers: 45, heroesUsed: [0], dailyRuns: 3, lifetimeEmbers: 320, heroWins: [0, 0, 0, 0, 0, 0], heroBestDepth: [0, 0, 0, 0, 0, 0], history: [] },
  veteran: {
    gamesPlayed: 42,
    victories: 3,
    bestScore: 14250,
    bestLevel: 10,
    totalGems: 610,
    embers: 340,
    lifetimeEmbers: 1900,
    forge: { whetstone: 1, ward: 1, purse: 2, scribe: 1 },
    maxAscension: 2,
    heroesUsed: [0, 1, 2, 4],
    heroWins: [2, 1, 0, 0, 1, 0],
    heroBestDepth: [2, 1, 0, 0, 0, 0],
    streak: 6,
    lastDailyDate: today,
    bestEndlessFloor: 14,
    dailyRuns: 9,
    dailyWins: 4,
    skins: { owned: ["0:ember", "0:royal", "1:frost"], equipped: { "0": "royal", "1": "frost" } },
    achievements: { first_blood: "2026-09-02", explorer: "2026-09-03", hoarder: "2026-09-10", wumpus_slayer: "2026-09-18" },
    history: Array.from({ length: 14 }, (_, i) => ({
      day: `2026-10-${String(i + 1).padStart(2, "0")}`,
      score: 1200 + ((i * 937) % 9000),
      level: 2 + (i % 8),
      victory: i % 6 === 5,
      mode: "expedition" as const,
    })),
  },
};

export interface DevLaunch {
  initialState?: { routes: { name: string; params?: object }[] };
}

/** Reads the query string, seeds storage and returns the route to open. Returns null outside a dev web build. */
export function readDevHarness(): DevLaunch | null {
  if (Platform.OS !== "web" || typeof __DEV__ === "undefined" || !__DEV__ || typeof window === "undefined") return null;
  try {
    const q = new URLSearchParams(window.location.search);
    const screen = q.get("screen");
    const preset = q.get("preset");
    if (!screen && !preset && !q.get("lang")) return null;

    if (preset && PRESETS[preset]) {
      window.localStorage.setItem(STATS_KEY, JSON.stringify({ ...EMPTY_STATS, ...PRESETS[preset] }));
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ state: { tutorialSeen: preset !== "new", language: q.get("lang") ?? "auto", hintsSeen: [], reduceFlash: q.get("calm") === "1", ...(q.get("pad") === "floating" ? { movePad: "floating" } : {}), ...(q.get("skin") ? { joystickSkin: q.get("skin") } : {}) }, version: 0 }),
      );
    }
    // ?monetization=on previews the locked states; &owned=1 pretends the full game was bought.
    if (q.get("monetization") === "on") setMonetizationOverride({ enabled: true });
    if (preset || q.get("owned")) window.localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify({ state: { fullUnlocked: q.get("owned") === "1" }, version: 0 }));
    if (!screen) return {};
    const params = q.get("params");
    return { initialState: { routes: [{ name: screen, params: params ? JSON.parse(params) : undefined }] } };
  } catch {
    return null;
  }
}
