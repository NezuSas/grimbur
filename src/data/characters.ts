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
    scoreImage: require("../assets/sprites/characters/Icon_Cyan.png"),
    attackImage: require("../assets/sprites/characters/Attack_Cyan.png"),
    playerImage: require("../assets/sprites/characters/Hero_Cyan.png"),
    winImage: require("../assets/sprites/characters/Win_Cyan.png"),
    loseImage: require("../assets/sprites/characters/Lose_Cyan.png"),
    arrowColor: "#00E5FF",
  },
  {
    id: 2,
    playerName: "Sera",
    scoreImage: require("../assets/sprites/characters/Icon_Red.png"),
    attackImage: require("../assets/sprites/characters/Attack_Red.png"),
    playerImage: require("../assets/sprites/characters/Hero_Red.png"),
    winImage: require("../assets/sprites/characters/Win_Red.png"),
    loseImage: require("../assets/sprites/characters/Lose_Red.png"),
    arrowColor: "#FF1744",
  },
  {
    id: 3,
    playerName: "Borin",
    scoreImage: require("../assets/sprites/characters/Icon_Green.png"),
    attackImage: require("../assets/sprites/characters/Attack_Green.png"),
    playerImage: require("../assets/sprites/characters/Hero_Green.png"),
    winImage: require("../assets/sprites/characters/Win_Green.png"),
    loseImage: require("../assets/sprites/characters/Lose_Green.png"),
    arrowColor: "#76FF03",
  },
  {
    id: 4,
    playerName: "Auric",
    scoreImage: require("../assets/sprites/characters/Icon_Gold.png"),
    attackImage: require("../assets/sprites/characters/Attack_Gold.png"),
    playerImage: require("../assets/sprites/characters/Hero_Gold.png"),
    winImage: require("../assets/sprites/characters/Win_Gold.png"),
    loseImage: require("../assets/sprites/characters/Lose_Gold.png"),
    arrowColor: "#FFD600",
  },
  {
    id: 5,
    playerName: "Mira",
    scoreImage: require("../assets/sprites/characters/Icon_Pink.png"),
    attackImage: require("../assets/sprites/characters/Attack_Pink.png"),
    playerImage: require("../assets/sprites/characters/Hero_Pink.png"),
    winImage: require("../assets/sprites/characters/Win_Pink.png"),
    loseImage: require("../assets/sprites/characters/Lose_Pink.png"),
    arrowColor: "#FF4FB0",
  },
  {
    id: 6,
    playerName: "Bram",
    scoreImage: require("../assets/sprites/characters/Icon_Orange.png"),
    attackImage: require("../assets/sprites/characters/Attack_Orange.png"),
    playerImage: require("../assets/sprites/characters/Hero_Orange.png"),
    winImage: require("../assets/sprites/characters/Hero_Orange.png"),
    loseImage: require("../assets/sprites/characters/Hero_Orange.png"),
    arrowColor: "#FF9100",
  },
];

export default characters;
