import React, { createContext, useContext } from "react";
import { View, useWindowDimensions as useRealWindowDimensions } from "react-native";
import { uiScaleFor } from "./uiScale";

/**
 * Menu screens on a big window (a tablet, a desktop browser) would draw phone-sized text in a sea of empty space. `withUiScale` draws such a
 * screen as if the window were smaller and scales the result up, so everything grows together. The screens ask for their size through
 * `useWindowDimensions` from here: inside a scaled screen it reports the smaller virtual window, anywhere else the real one.
 * On phones the scale is 1 and nothing is added (no extra view, no transform).
 */
type Dims = { width: number; height: number; scale: number };
const ScaleContext = createContext<Dims | null>(null);

/** The window size the screen should lay itself out in. */
export function useWindowDimensions() {
  const real = useRealWindowDimensions();
  const scaled = useContext(ScaleContext);
  return scaled ? { ...real, width: scaled.width, height: scaled.height } : real;
}

/** How much the current screen is scaled up (1 when it is not). */
export const useUiScale = (): number => useContext(ScaleContext)?.scale ?? 1;

export function withUiScale<P extends object>(Screen: React.ComponentType<P>): React.FC<P> {
  const Scaled: React.FC<P> = props => {
    const { width, height } = useRealWindowDimensions();
    const scale = uiScaleFor(width, height);
    if (scale === 1) return <Screen {...props} />;
    const w = width / scale;
    const h = height / scale;
    return (
      <View style={{ flex: 1, overflow: "hidden", backgroundColor: "#000" }}>
        <ScaleContext.Provider value={{ width: w, height: h, scale }}>
          <View style={{ width: w, height: h, transform: [{ scale }], transformOrigin: "top left" }}>
            <Screen {...props} />
          </View>
        </ScaleContext.Provider>
      </View>
    );
  };
  Scaled.displayName = `Scaled(${Screen.displayName ?? Screen.name ?? "Screen"})`;
  return Scaled;
}
