import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

/** Rolls a shown number towards its target instead of jumping, so spending and earning read as movement. */
export const useRollTo = (target: number, calm: boolean): number => {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    if (calm || shownRef.current === target) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const anim = new Animated.Value(shownRef.current);
    const id = anim.addListener(({ value }) => {
      shownRef.current = Math.round(value);
      setShown(shownRef.current);
    });
    Animated.timing(anim, { toValue: target, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      shownRef.current = target;
      setShown(target);
    });
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [target, calm]);
  return shown;
};
