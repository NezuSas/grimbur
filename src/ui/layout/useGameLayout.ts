import { useWindowDimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Wumpus Adventures — Game Camera Layout Hook
 * Provides responsive dimensions for the landscape-locked game screen.
 */
export const useGameLayout = (boardColumns: number = 15, boardRows: number = 8) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Basic flags
  const isTablet = screenWidth >= 900;

  // Layout segments — match actual ScoreBar rendered height (avatar + paddingVertical)
  const hudHeight = Platform.OS === 'android' ? 72 : 76;
  const controlPanelWidth = Math.max(screenWidth * 0.20, 190);
  
  // Buffers - Set to absolute zero for no-gap scaling
  const horizontalBuffer = 0; 
  const verticalBuffer = 0;

  // The actual available space for the board
  const cameraWidth = screenWidth - controlPanelWidth - insets.left - insets.right - horizontalBuffer;
  const cameraHeight = screenHeight - hudHeight - insets.top - insets.bottom - verticalBuffer;

  // Tile Sizing (Centered Camera Logic)
  const tileSize = Math.min(
    cameraWidth / boardColumns,
    cameraHeight / boardRows
  );

  const boardWidth = tileSize * boardColumns;
  const boardHeight = tileSize * boardRows;

  // UI Element Sizing
  const heroSize = controlPanelWidth * 0.45;
  const directionSize = controlPanelWidth * 0.17;
  const buttonSize = directionSize; 
  const attackSize = directionSize * 1.15;
  const buttonGap = directionSize * 0.25;
  const iconSize = Math.min(hudHeight * 0.75, 34);
  
  // Font scaling helper (relative to screen width)
  const fontSize = (val: number) => (val / 1200) * screenWidth;

  // Typography scaling
  const titleSize = fontSize(32);
  const textSize = fontSize(18);

  // Spacing helper (relative to screen height for landscape)
  const spacing = (val: number) => (val / 800) * screenHeight;

  return {
    screenWidth,
    screenHeight,
    isTablet,
    hudHeight,
    controlPanelWidth,
    cameraWidth,
    cameraHeight,
    tileSize,
    boardWidth,
    boardHeight,
    heroSize,
    directionSize,
    buttonSize,
    attackSize,
    buttonGap,
    iconSize,
    spacing,
    fontSize,
    titleSize,
    textSize,
    insets,
    boardColumns,
    boardRows
  };
};
