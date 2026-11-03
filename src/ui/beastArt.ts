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
  chest: require("../assets/sprites/items/Icon_Chest.png"),
};

/** The colour of each creature (cards, banner rims). */
export const BEAST_TINT: Record<BeastId, string> = {
  enemy: "#FF8A65", stalker: "#B388FF", sleeper: "#80CBC4", mimic: "#4FC3F7", thief: "#FFD54F",
  brute: "#FF7043", warden: "#FF6E40", boss: "#FF5252", ancient: "#80DEEA", pit: "#CE93D8", trap: "#BCAAA4", chest: "#FFCA28",
};
