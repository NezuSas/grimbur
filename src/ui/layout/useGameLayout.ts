import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettingsStore } from "../../state/settings/store";

import type { ControlSize } from '../../state/settings/types';

/** How much the player's size setting scales the pad and the attack button. */
const CONTROL_SCALE: Record<ControlSize, number> = { small: 0.85, medium: 1, large: 1.2 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Smallest text size the UI scales down to, so nothing becomes unreadable on small phones. */
export const MIN_FONT_SIZE = 11;
/** Minimum comfortable touch target (dp). */
export const MIN_TOUCH = 46;
/** Horizontal breathing room around the board row in the game screen. */
export const GAME_ROW_PADDING = 12;

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
  const controlSize = useSettingsStore(s => s.controlSize);
  // The extra column needs a wide landscape window (portrait or tall split-screen windows keep the pad as is).
  const splitAttack =
    attackPlacement === 'side' && screenWidth >= MIN_WIDTH_FOR_SPLIT_ATTACK && screenWidth > screenHeight;

  // HUD: a fixed, predictable height (the ScoreBar renders exactly this tall).
  const hudHeight = clamp(screenHeight * 0.16, 54, 96);

  // Control panel: one round direction pad. It is as wide as the panel allows but never taller than the space
  // under the HUD, and never smaller than a comfortable thumb target.
  const cameraHeightForPad = screenHeight - hudHeight - insets.top - insets.bottom;
  const basePad = clamp(Math.min(clamp(screenWidth * 0.2, 150, 280) - 8, cameraHeightForPad - 8, 230), 120, 230);
  // The player's size preference scales the pad and the attack button together (never taller than the space).
  const padDiameter = clamp(basePad * CONTROL_SCALE[controlSize], 108, Math.max(108, Math.min(cameraHeightForPad - 8, 280)));
  const controlPanelWidth = padDiameter + 8;
  // The attack button gets its own column on the opposite side.
  const attackPanelWidth = splitAttack ? clamp(screenWidth * 0.12 * CONTROL_SCALE[controlSize], 80, 160) : 0;

  // Space left for the board once the HUD, control panel, insets and row padding are paid for.
  const cameraWidth = screenWidth - controlPanelWidth - attackPanelWidth - insets.left - insets.right - GAME_ROW_PADDING * 2;
  const cameraHeight = screenHeight - hudHeight - insets.top - insets.bottom;

  const tileSize = Math.max(8, Math.min(cameraWidth / boardColumns, cameraHeight / boardRows));
  const boardWidth = tileSize * boardColumns;
  const boardHeight = tileSize * boardRows;

  // UI Element Sizing
  const heroSize = controlPanelWidth * 0.45;
  const attackSize = splitAttack ? Math.min(attackPanelWidth * 0.9, padDiameter * 0.6, 110) : padDiameter * 0.36;

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
    padDiameter,
    tileSize,
    boardWidth,
    boardHeight,
    heroSize,
    attackSize,
    spacing,
    fontSize,
    titleSize,
    insets,
  };
};
