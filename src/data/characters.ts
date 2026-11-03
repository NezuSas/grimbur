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
    playerName: "Vael",
    scoreImage: require("../assets/sprites/characters/Icon_Cyan.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Cyan.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Cyan.webp"),
    winImage: require("../assets/sprites/characters/Win_Cyan.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Cyan.webp"),
    arrowColor: "#00E5FF",
  },
  {
    id: 2,
    playerName: "Sera",
    scoreImage: require("../assets/sprites/characters/Icon_Red.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Red.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Red.webp"),
    winImage: require("../assets/sprites/characters/Win_Red.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Red.webp"),
    arrowColor: "#C23A44",
  },
  {
    id: 3,
    playerName: "Borin",
    scoreImage: require("../assets/sprites/characters/Icon_Green.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Green.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Green.webp"),
    winImage: require("../assets/sprites/characters/Win_Green.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Green.webp"),
    arrowColor: "#93C450",
  },
  {
    id: 4,
    playerName: "Auric",
    scoreImage: require("../assets/sprites/characters/Icon_Gold.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Gold.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Gold.webp"),
    winImage: require("../assets/sprites/characters/Win_Gold.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Gold.webp"),
    arrowColor: "#FFD600",
  },
  {
    id: 5,
    playerName: "Mira",
    scoreImage: require("../assets/sprites/characters/Icon_Pink.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Pink.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Pink.webp"),
    winImage: require("../assets/sprites/characters/Win_Pink.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Pink.webp"),
    arrowColor: "#FF4FB0",
  },
  {
    id: 6,
    playerName: "Bram",
    scoreImage: require("../assets/sprites/characters/Icon_Orange.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Orange.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Orange.webp"),
    winImage: require("../assets/sprites/characters/Win_Orange.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Orange.webp"),
    arrowColor: "#FF9100",
  },
];

export default characters;
