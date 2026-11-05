import { ImageSourcePropType } from "react-native";

export interface Character {
  id: number;
  playerName: string;
  scoreImage: ImageSourcePropType;
  attackImage: ImageSourcePropType;
  playerImage: ImageSourcePropType;
  winImage: ImageSourcePropType;
  loseImage: ImageSourcePropType;
  /** Facing the viewer (moving down) / walking away (moving up); missing = the side view, as before. */
  frontImage?: ImageSourcePropType;
  backImage?: ImageSourcePropType;
  /** Two steps of the side view walking (left foot, then right foot forward); missing = the side view glides. */
  walkImages?: readonly [ImageSourcePropType, ImageSourcePropType];
  /** Attacking toward the viewer (down) / away from it (up); missing = the front / back view lunges. */
  attackFrontImage?: ImageSourcePropType;
  attackBackImage?: ImageSourcePropType;
  /** Two steps walking toward the viewer (down) / away from it (up); missing = the front / back view glides. */
  frontWalkImages?: readonly [ImageSourcePropType, ImageSourcePropType];
  backWalkImages?: readonly [ImageSourcePropType, ImageSourcePropType];
  arrowColor: string;
}

const characters: Character[] = [
  {
    id: 1,
    playerName: "Vael",
    scoreImage: require("../assets/sprites/characters/Icon_Cyan.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Cyan.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Cyan.webp"),
    frontImage: require("../assets/sprites/characters/Front_Cyan.webp"),
    backImage: require("../assets/sprites/characters/Back_Cyan.webp"),
    walkImages: [require("../assets/sprites/characters/Walk1_Cyan.webp"), require("../assets/sprites/characters/Walk2_Cyan.webp")],
    attackFrontImage: require("../assets/sprites/characters/AttackFront_Cyan.webp"),
    attackBackImage: require("../assets/sprites/characters/AttackBack_Cyan.webp"),
    frontWalkImages: [require("../assets/sprites/characters/FrontWalk1_Cyan.webp"), require("../assets/sprites/characters/FrontWalk2_Cyan.webp")],
    backWalkImages: [require("../assets/sprites/characters/BackWalk1_Cyan.webp"), require("../assets/sprites/characters/BackWalk2_Cyan.webp")],
    winImage: require("../assets/sprites/characters/Win_Cyan.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Cyan.webp"),
    arrowColor: "#5FB4C4",
  },
  {
    id: 2,
    playerName: "Sera",
    scoreImage: require("../assets/sprites/characters/Icon_Red.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Red.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Red.webp"),
    frontImage: require("../assets/sprites/characters/Front_Red.webp"),
    backImage: require("../assets/sprites/characters/Back_Red.webp"),
    walkImages: [require("../assets/sprites/characters/Walk1_Red.webp"), require("../assets/sprites/characters/Walk2_Red.webp")],
    attackFrontImage: require("../assets/sprites/characters/AttackFront_Red.webp"),
    attackBackImage: require("../assets/sprites/characters/AttackBack_Red.webp"),
    frontWalkImages: [require("../assets/sprites/characters/FrontWalk1_Red.webp"), require("../assets/sprites/characters/FrontWalk2_Red.webp")],
    backWalkImages: [require("../assets/sprites/characters/BackWalk1_Red.webp"), require("../assets/sprites/characters/BackWalk2_Red.webp")],
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
    frontImage: require("../assets/sprites/characters/Front_Green.webp"),
    backImage: require("../assets/sprites/characters/Back_Green.webp"),
    walkImages: [require("../assets/sprites/characters/Walk1_Green.webp"), require("../assets/sprites/characters/Walk2_Green.webp")],
    attackFrontImage: require("../assets/sprites/characters/AttackFront_Green.webp"),
    attackBackImage: require("../assets/sprites/characters/AttackBack_Green.webp"),
    frontWalkImages: [require("../assets/sprites/characters/FrontWalk1_Green.webp"), require("../assets/sprites/characters/FrontWalk2_Green.webp")],
    backWalkImages: [require("../assets/sprites/characters/BackWalk1_Green.webp"), require("../assets/sprites/characters/BackWalk2_Green.webp")],
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
    frontImage: require("../assets/sprites/characters/Front_Gold.webp"),
    backImage: require("../assets/sprites/characters/Back_Gold.webp"),
    walkImages: [require("../assets/sprites/characters/Walk1_Gold.webp"), require("../assets/sprites/characters/Walk2_Gold.webp")],
    attackFrontImage: require("../assets/sprites/characters/AttackFront_Gold.webp"),
    attackBackImage: require("../assets/sprites/characters/AttackBack_Gold.webp"),
    frontWalkImages: [require("../assets/sprites/characters/FrontWalk1_Gold.webp"), require("../assets/sprites/characters/FrontWalk2_Gold.webp")],
    backWalkImages: [require("../assets/sprites/characters/BackWalk1_Gold.webp"), require("../assets/sprites/characters/BackWalk2_Gold.webp")],
    winImage: require("../assets/sprites/characters/Win_Gold.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Gold.webp"),
    arrowColor: "#D4B448",
  },
  {
    id: 5,
    playerName: "Mira",
    scoreImage: require("../assets/sprites/characters/Icon_Pink.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Pink.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Pink.webp"),
    frontImage: require("../assets/sprites/characters/Front_Pink.webp"),
    backImage: require("../assets/sprites/characters/Back_Pink.webp"),
    walkImages: [require("../assets/sprites/characters/Walk1_Pink.webp"), require("../assets/sprites/characters/Walk2_Pink.webp")],
    attackFrontImage: require("../assets/sprites/characters/AttackFront_Pink.webp"),
    attackBackImage: require("../assets/sprites/characters/AttackBack_Pink.webp"),
    frontWalkImages: [require("../assets/sprites/characters/FrontWalk1_Pink.webp"), require("../assets/sprites/characters/FrontWalk2_Pink.webp")],
    backWalkImages: [require("../assets/sprites/characters/BackWalk1_Pink.webp"), require("../assets/sprites/characters/BackWalk2_Pink.webp")],
    winImage: require("../assets/sprites/characters/Win_Pink.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Pink.webp"),
    arrowColor: "#BF6496",
  },
  {
    id: 6,
    playerName: "Bram",
    scoreImage: require("../assets/sprites/characters/Icon_Orange.webp"),
    attackImage: require("../assets/sprites/characters/Attack_Orange.webp"),
    playerImage: require("../assets/sprites/characters/Hero_Orange.webp"),
    frontImage: require("../assets/sprites/characters/Front_Orange.webp"),
    backImage: require("../assets/sprites/characters/Back_Orange.webp"),
    walkImages: [require("../assets/sprites/characters/Walk1_Orange.webp"), require("../assets/sprites/characters/Walk2_Orange.webp")],
    attackFrontImage: require("../assets/sprites/characters/AttackFront_Orange.webp"),
    attackBackImage: require("../assets/sprites/characters/AttackBack_Orange.webp"),
    frontWalkImages: [require("../assets/sprites/characters/FrontWalk1_Orange.webp"), require("../assets/sprites/characters/FrontWalk2_Orange.webp")],
    backWalkImages: [require("../assets/sprites/characters/BackWalk1_Orange.webp"), require("../assets/sprites/characters/BackWalk2_Orange.webp")],
    winImage: require("../assets/sprites/characters/Win_Orange.webp"),
    loseImage: require("../assets/sprites/characters/Lose_Orange.webp"),
    arrowColor: "#CC8436",
  },
];

export default characters;
