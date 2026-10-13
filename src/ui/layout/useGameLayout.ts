import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettingsStore } from "../../state/settings/store";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Smallest text size the UI scales down to, so nothing becomes unreadable on small phones. */
export const MIN_FONT_SIZE = 11;
/** Minimum comfortable touch target (dp). */
export const MIN_TOUCH = 46;
/** Horizontal breathing room around the board row in the game screen. */
export const GAME_ROW_PADDING = 12;

/** The direction pad needs 4.26 button-widths: 3.1 for the middle row, plus gaps and padding. */
export const PAD_WIDTH_IN_BUTTONS = 4.26;
/** Without the attack button in the middle the pad is narrower. */
export const PAD_WIDTH_IN_BUTTONS_SPLIT = 3.86;
/** Windows narrower than this keep the attack button in the pad: the board needs the room. */
export const MIN_WIDTH_FOR_SPLIT_ATTACK = 720;

/**
 * Wumpus Adventures — Game Camera Layout Hook
 * Provides responsive dimensions for the landscape game screen. Everything the game
 * screen needs (HUD, control panel, board) derives from the live window size and the
 * safe-area insets, so rotation, split-screen and display-size changes just work.
 */
export const useGameLayout = (boardColumns: number = 15, boardRows: number = 8) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const attackPlacement = useSettingsStore(s => s.attackButton);
  // The extra column needs a wide landscape window (portrait or tall split-screen windows keep the pad as is).
  const splitAttack =
    attackPlacement === 'side' && screenWidth >= MIN_WIDTH_FOR_SPLIT_ATTACK && screenWidth > screenHeight;

  // HUD: a fixed, predictable height (the ScoreBar renders exactly this tall).
  const hudHeight = clamp(screenHeight * 0.16, 54, 96);

  // Control panel: wide enough for the direction pad at a comfortable button size.
  const padUnits = splitAttack ? PAD_WIDTH_IN_BUTTONS_SPLIT : PAD_WIDTH_IN_BUTTONS;
  const controlPanelWidth = clamp(screenWidth * (splitAttack ? 0.19 : 0.22), MIN_TOUCH * padUnits, 320);
  const padButtonSize = clamp(controlPanelWidth / padUnits, MIN_TOUCH, 76);
  // The attack button gets its own column on the opposite side, a little bigger than a move button.
  const attackPanelWidth = splitAttack ? clamp(screenWidth * 0.12, 72, 130) : 0;

  // Space left for the board once the HUD, control panel, insets and row padding are paid for.
  const cameraWidth = screenWidth - controlPanelWidth - attackPanelWidth - insets.left - insets.right - GAME_ROW_PADDING * 2;
  const cameraHeight = screenHeight - hudHeight - insets.top - insets.bottom;

  const tileSize = Math.max(8, Math.min(cameraWidth / boardColumns, cameraHeight / boardRows));
  const boardWidth = tileSize * boardColumns;
  const boardHeight = tileSize * boardRows;

  // UI Element Sizing
  const heroSize = controlPanelWidth * 0.45;
  const attackSize = splitAttack ? Math.min(attackPanelWidth * 0.85, padButtonSize * 1.4) : padButtonSize * 1.1;
  const buttonGap = padButtonSize * 0.22;

  // Font scaling helper: relative to screen width, never below a readable floor.
  const fontSize = (val: number) => Math.max(MIN_FONT_SIZE, (val / 1200) * screenWidth);

  // Typography scaling
  const titleSize = fontSize(32);

  // Spacing helper (relative to screen height for landscape)
  const spacing = (val: number) => (val / 800) * screenHeight;

  return {
    screenWidth,
    screenHeight,
    hudHeight,
    controlPanelWidth,
    attackPanelWidth,
    splitAttack,
    padButtonSize,
    tileSize,
    boardWidth,
    boardHeight,
    heroSize,
    attackSize,
    buttonGap,
    spacing,
    fontSize,
    titleSize,
    insets,
  };
};
