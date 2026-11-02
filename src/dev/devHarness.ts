import { Platform } from "react-native";
import { COSMETICS } from "../core/cosmetics/cosmetics";
import { EMPTY_MISSIONS, missionDef, syncMissions } from "../core/stats/missions";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { dailyKey } from "../core/engine/seed";
import { setMonetizationOverride } from "../services/entitlements";
import { makeChallengeCode } from "../core/challenge/code";

/**
 * Development-only helper for the web build: open any screen directly, with a stats preset, so every screen can be
 * checked at any window size (see scripts/screenshots.ps1).
 *
 *   http://localhost:8081/?screen=ForgeScreen&preset=veteran&lang=en
 *   ?params={"mode":"daily"}  extra route params as JSON
 *
 * It never runs in a production bundle or on a device.
 */

const STATS_KEY = "grimbur.stats.v1";
const SETTINGS_KEY = "grimbur-adventures-settings";
const ENTITLEMENTS_KEY = "grimbur-adventures-entitlements";

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
    // Mastery ranks to show: gold (Vael), silver (Sera), bronze (Borin).
    heroXp: [29000, 14000, 3500, 0, 800, 0],
    streak: 6,
    lastDailyDate: today,
    // Today's chest already opened (day 3), so the cover stays clear; devChest shows it anyway.
    chest: { last: today, day: 3 },
    // Five secret rooms found: five chronicle fragments read.
    secretsFound: 5,
    encounterBook: { seen: ["scout", "gambler", "shrine", "miner"], gamblesWon: 2, minersFreed: 1 },
    heroQuests: [3, 1, 0, 0, 7, 0],
    // The crystal fox grown up (adult form and aura) and the firefly young.
    petFloors: { pet_fox: 230, pet_firefly: 60 },
    // A daily already tried today: its best path shows as footprints on the next try, and where it fell.
    daily: { date: today, bestScore: 2100, bestLevel: 2, attempts: 1, ghost: { paths: { "1": [0, 1, 2, 10, 11, 12, 20] }, fell: [1, 21] } },
    // Missions with some progress: one done and waiting, one partly done, one claimed
    missions: (() => {
      const sync = syncMissions(EMPTY_MISSIONS, today);
      const goals = [missionDef(sync.daily[0].id)!, missionDef(sync.daily[1].id)!, missionDef(sync.daily[2].id)!];
      return {
        ...sync,
        daily: [
          { ...sync.daily[0], progress: goals[0].target },
          { ...sync.daily[1], progress: Math.max(1, Math.floor(goals[1].target * 0.6)) },
          { ...sync.daily[2], progress: 0 },
        ],
        weekly: [{ ...sync.weekly[0], progress: Math.max(1, Math.floor(missionDef(sync.weekly[0].id)!.target * 0.4)) }, sync.weekly[1]],
      };
    })(),
    bestEndlessFloor: 14,
    dailyRuns: 9,
    dailyWins: 4,
    skins: { owned: ["0:ember", "0:royal", "1:frost"], equipped: { "0": "royal", "1": "frost" } },
    cosmetics: { owned: ["frame_gold", "title_explorer", "pet_fox"], equipped: { frame: "frame_gold", title: "title_explorer", pet: "pet_fox" }, deals: { date: null, bought: [] } },
    achievements: { first_blood: "2026-09-02", explorer: "2026-09-03", hoarder: "2026-09-10", grimbur_slayer: "2026-09-18" },
    history: Array.from({ length: 14 }, (_, i) => ({
      day: `2026-10-${String(i + 1).padStart(2, "0")}`,
      score: 1200 + ((i * 937) % 9000),
      level: 2 + (i % 8),
      victory: i % 6 === 5,
      mode: "expedition" as const,
      hero: [0, 1, 2, 4][i % 4],
      relics: [["quiver", "lantern", "phoenix"], ["magnet", "lucky_coin"], ["iron_boots", "owl", "raven_eye", "frost"]][i % 3],
      cause: i % 6 === 5 ? undefined : ["enemy", "pit", "stalker", "mimic"][i % 4],
      time: 300 + i * 41,
      gems: 8 + i * 3,
      event: i > 10 ? "vortex" : undefined,
      encounters: [["scout", "done", 2], ["gambler", "win", 4], ["echo", "lose", 6]].slice(0, 1 + (i % 3)) as [string, string, number][],
      secrets: i % 3,
      board: {
        rows: 5,
        cols: 15,
        player: 22 + (i % 5),
        visited: [0, 1, 2, 15, 16, 17, 18, 3, 4, 19, 20, 21, 22, 23, 24, 25, 26].slice(0, 13 + (i % 5)),
        things: [[5, "enemy"], [33, "pit"], [40, "coin"], [48, "stalker"], [60, "coin"], [11, "pit"], [27, "enemy"], [70, "chest"], [23, ["enemy", "pit", "stalker", "mimic"][i % 4]]] as [number, string][],
      },
    })),
    relicBook: { picks: { quiver: 9, lantern: 6, phoenix: 5, magnet: 4, lucky_coin: 4, iron_boots: 3, owl: 3, raven_eye: 2, frost: 2, blood_pact: 1 }, wins: { quiver: 2, phoenix: 2, lantern: 1 } },
    heroRuns: [21, 9, 6, 0, 4, 0],
    heroBestFloor: [10, 10, 7, 0, 10, 0],
    heroBestScore: [14250, 11980, 6200, 0, 9100, 0],
    bestiary: { met: ["enemy", "stalker", "pit", "mimic", "chest", "sleeper"], slain: { enemy: 31, stalker: 7, mimic: 2, sleeper: 3 } },
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
    // ?collector=1 owns every cosmetic for sale, so the collection rewards (and their banner) can be reviewed.
    if (q.get("collector") === "1") {
      const saved = JSON.parse(window.localStorage.getItem(STATS_KEY) ?? "{}");
      const owned = COSMETICS.filter(c => c.price > 0).map(c => c.id);
      window.localStorage.setItem(STATS_KEY, JSON.stringify({ ...EMPTY_STATS, ...saved, cosmetics: { ...EMPTY_STATS.cosmetics, ...saved.cosmetics, owned } }));
    }
    // ?monetization=on previews the locked states; &owned=1 pretends the full game was bought.
    // The veteran also has a name, a few finished duels and some challenges, so Friends shows its lists.
    if (preset === "veteran") {
      const day = 86_400_000;
      const now = Date.now();
      window.localStorage.setItem("grimbur.player.name.v1", "Oscar");
      window.localStorage.setItem(
        "grimbur.duel.history.v1",
        JSON.stringify([
          { code: makeChallengeCode(11, 1), at: now - day, outcome: "won", placement: 1, total: 2, stake: 100, net: 80 },
          { code: makeChallengeCode(22, 2), at: now - 2 * day, outcome: "lost", placement: 3, total: 4, stake: 50, net: -50 },
          { code: makeChallengeCode(33, 0), at: now - 3 * day, outcome: "tie", placement: 1, total: 2, stake: 0, net: 0 },
        ]),
      );
      window.localStorage.setItem(
        "grimbur.challenges.recent.v1",
        JSON.stringify([
          { code: makeChallengeCode(44, 1), best: 8450, at: now - day },
          { code: makeChallengeCode(55, 3), best: null, at: now - 4 * day },
        ]),
      );
    }
    if (q.get("monetization") === "on") setMonetizationOverride({ enabled: true });
    if (preset || q.get("owned")) window.localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify({ state: { fullUnlocked: q.get("owned") === "1" }, version: 0 }));
    if (!screen) return {};
    const params = q.get("params");
    return { initialState: { routes: [{ name: screen, params: params ? JSON.parse(params) : undefined }] } };
  } catch {
    return null;
  }
}
