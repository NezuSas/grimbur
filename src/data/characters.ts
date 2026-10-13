import { ImageSourcePropType } from "react-native";

export interface Character {
  id: number;
  playerName: string;
  scoreImage: ImageSourcePropType;
  attackImage: ImageSourcePropType;
  playerImage: ImageSourcePropType;
  winImage: ImageSourcePropType;
  loseImage: ImageSourcePropType;
  arrowColor: string;
}

const characters: Character[] = [
  {
    id: 1,
    playerName: "Cyan Explorer",
    scoreImage: require("../assets/sprites/characters/Icon_Cyan.png"),
    attackImage: require("../assets/sprites/characters/Attack_Cyan.png"),
    playerImage: require("../assets/sprites/characters/Hero_Cyan.png"),
    winImage: require("../assets/sprites/characters/Hero_Cyan.png"),
    loseImage: require("../assets/sprites/characters/Hero_Cyan.png"),
    arrowColor: "#00E5FF",
  },
  {
    id: 2,
    playerName: "Scarlet Knight",
    scoreImage: require("../assets/sprites/characters/Icon_Red.png"),
    attackImage: require("../assets/sprites/characters/Attack_Red.png"),
    playerImage: require("../assets/sprites/characters/Hero_Red.png"),
    winImage: require("../assets/sprites/characters/Hero_Red.png"),
    loseImage: require("../assets/sprites/characters/Hero_Red.png"),
    arrowColor: "#FF1744",
  },
  {
    id: 3,
    playerName: "Moss Golem",
    scoreImage: require("../assets/sprites/characters/Icon_Green.png"),
    attackImage: require("../assets/sprites/characters/Attack_Green.png"),
    playerImage: require("../assets/sprites/characters/Hero_Green.png"),
    winImage: require("../assets/sprites/characters/Hero_Green.png"),
    loseImage: require("../assets/sprites/characters/Hero_Green.png"),
    arrowColor: "#76FF03",
  },
  {
    id: 4,
    playerName: "Golden Rogue",
    scoreImage: require("../assets/sprites/characters/Icon_Gold.png"),
    attackImage: require("../assets/sprites/characters/Attack_Gold.png"),
    playerImage: require("../assets/sprites/characters/Hero_Gold.png"),
    winImage: require("../assets/sprites/characters/Hero_Gold.png"),
    loseImage: require("../assets/sprites/characters/Hero_Gold.png"),
    arrowColor: "#FFD600",
  },
];

export default characters;
