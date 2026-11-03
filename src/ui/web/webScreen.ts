import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * The browser's screen, for the web build played on a phone: is it a touch device, is it held upright, is the game full screen
 * (or opened from the home screen, where the browser shows no bar), and the way into full screen. The game is landscape-only;
 * a browser cannot be told to turn, but in full screen Android lets the page lock itself to landscape.
 */
const web = Platform.OS === "web" && typeof window !== "undefined" && typeof document !== "undefined";

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

/** A phone or tablet (a coarse pointer, no hover): the only devices told to turn or offered full screen. */
export const isTouchWeb = (): boolean =>
  web && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(hover: hover)").matches;

/** iPhone or iPad (iPadOS reports a Mac with touch). */
export const isIOSWeb = (): boolean =>
  web && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** An iPhone (or iPod): its browsers (Safari, and Chrome on it, which is Safari inside) never put a page in full screen. */
export const isIPhoneWeb = (): boolean => web && /iPhone|iPod/.test(navigator.userAgent);

/** Opened from the home screen as an app: the browser draws no bar. */
export const isStandalone = (): boolean =>
  web &&
  ((typeof window.matchMedia === "function" && (window.matchMedia("(display-mode: fullscreen)").matches || window.matchMedia("(display-mode: standalone)").matches)) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isFullscreen = (): boolean => web && !!(document.fullscreenElement ?? (document as FsDoc).webkitFullscreenElement);

/**
 * The browser can put the page in full screen. Never an iPhone: its Safari only does it for videos, even where the function
 * exists (calling it fails quietly, and the button seemed to do nothing).
 */
export const canFullscreen = (): boolean => {
  if (!web || isIPhoneWeb()) return false;
  const el = document.documentElement as FsEl;
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
};

/**
 * Full screen, then landscape locked (Android). Must run inside a tap. Never throws; says whether the page is full screen
 * after it (false: the browser refused, and the player is better told how to add the game to the home screen).
 */
export async function enterFullscreen(): Promise<boolean> {
  if (!web) return false;
  try {
    const el = document.documentElement as FsEl;
    if (!isFullscreen()) {
      // Safari on an iPad knows the unprefixed call only lately, and refuses options it does not know: the plain call first.
      if (typeof el.webkitRequestFullscreen === "function" && isIOSWeb()) await el.webkitRequestFullscreen();
      else if (typeof el.requestFullscreen === "function") await el.requestFullscreen({ navigationUI: "hide" });
      else await el.webkitRequestFullscreen?.();
    }
  } catch {
    return false;
  }
  // Some browsers neither throw nor go full screen: look once the change has had a moment.
  await new Promise(r => setTimeout(r, 350));
  if (!isFullscreen()) return false;
  try {
    await (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
  } catch {
    // Not every browser locks; the turn-your-phone card covers the rest.
  }
  return true;
}

export async function exitFullscreen(): Promise<void> {
  if (!web || !isFullscreen()) return;
  try {
    const doc = document as FsDoc;
    if (typeof document.exitFullscreen === "function") await document.exitFullscreen();
    else await doc.webkitExitFullscreen?.();
  } catch {
    // Already out.
  }
}

export type WebScreen = { touch: boolean; portrait: boolean; fullscreen: boolean; standalone: boolean; canFullscreen: boolean; ios: boolean };

/** The browser screen, kept current as the phone turns or full screen comes and goes. */
export function useWebScreen(): WebScreen {
  const read = (): WebScreen => ({
    touch: isTouchWeb(),
    portrait: web && window.innerHeight > window.innerWidth,
    fullscreen: isFullscreen(),
    standalone: isStandalone(),
    canFullscreen: canFullscreen(),
    ios: isIOSWeb(),
  });
  const [state, setState] = useState(read);
  useEffect(() => {
    if (!web) return;
    const update = () => setState(read());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}
