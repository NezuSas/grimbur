import type { ImageSourcePropType } from "react-native";
import type { BeastId } from "../core/stats/bestiary";

/** The picture of every creature and danger of the bestiary (the guide, the discovery banner). */
export const BEAST_ART: Record<BeastId, ImageSourcePropType> = {
  enemy: require("../assets/sprites/enemies/Guardian_Enemy.webp"),
  stalker: require("../assets/sprites/enemies/Stalker_Enemy.webp"),
  sleeper: require("../assets/sprites/enemies/Sleeper_Enemy.webp"),
  mimic: require("../assets/sprites/enemies/Mimic_Enemy.webp"),
  thief: require("../assets/sprites/enemies/Thief_Enemy.webp"),
  brute: require("../assets/sprites/enemies/Lieutenant_Boss.webp"),
  warden: require("../assets/sprites/enemies/Warden_Boss.webp"),
  boss: require("../assets/sprites/enemies/Grimbur_Boss.webp"),
  ancient: require("../assets/sprites/enemies/Ancient_Boss.webp"),
  pit: require("../assets/sprites/tiles/Danger_Vortex.png"),
  trap: require("../assets/sprites/tiles/Trap_Sprung.png"),
  chest: require("../assets/sprites/items/Icon_Chest.webp"),
};

/** The colour of each creature (cards, banner rims). */
export const BEAST_TINT: Record<BeastId, string> = {
  enemy: "#D28663", stalker: "#9E8BCB", sleeper: "#8EB7B0", mimic: "#7FAFC6", thief: "#D9B45A",
  brute: "#CC6E44", warden: "#FF6E40", boss: "#CC5249", ancient: "#8FC0C5", pit: "#B08DBE", trap: "#BCAAA4", chest: "#D6AA48",
};
