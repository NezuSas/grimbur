import React, { useLayoutEffect, useRef } from 'react';
import { Platform, StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { familyForWeight } from '../fonts';

type Ref = React.ComponentRef<typeof RNText>;

const LINING: TextStyle['fontVariant'] = ['lining-nums'];

/** How far a text held to a few lines may shrink on its own before an ellipsis cuts it. */
const AUTO_MIN_SCALE = 0.7;

/** The text's own font variants plus lining figures (unless it asks for old-style ones). */
function withLining(v: TextStyle['fontVariant']): TextStyle['fontVariant'] {
  if (!v || !v.length) return LINING;
  if (!Array.isArray(v)) return v;
  return v.includes('lining-nums') || v.includes('oldstyle-nums') ? v : [...v, 'lining-nums'];
}

/** Drop-in replacement for react-native's Text that uses the game's typeface and weight files. */
const Text = React.forwardRef<Ref, TextProps>(({ style, ...rest }, ref) => {
  const flat = StyleSheet.flatten(style) ?? {};
  // Alegreya Sans draws old-style figures by default; scores, timers and counters read evenly with lining ones.
  const lining = withLining(flat.fontVariant);
  const resolved = flat.fontFamily
    ? { ...flat, fontVariant: lining }
    : { ...flat, fontFamily: familyForWeight(flat.fontWeight, flat.fontSize), fontWeight: undefined, fontVariant: lining };
  // A text held to a few lines shrinks a little to fit before it is ever cut with an ellipsis (the inscription face of the
  // titles is wide); one that already says how it fits keeps its own setting.
  const fitProps =
    rest.numberOfLines && rest.adjustsFontSizeToFit === undefined
      ? { adjustsFontSizeToFit: true, minimumFontScale: rest.minimumFontScale ?? AUTO_MIN_SCALE }
      : null;
  const props = fitProps ? { ...rest, ...fitProps } : rest;
  if (Platform.OS === 'web' && props.adjustsFontSizeToFit && props.numberOfLines) {
    return <WebFitText ref={ref} style={resolved} {...props} />;
  }
  return <RNText ref={ref} style={resolved} {...props} />;
});
Text.displayName = 'Text';

export default Text;

/**
 * How much wider than its box a one-line text is (above 1: the browser cuts it with an ellipsis). The text's own drawn
 * extent (a range over it: the whole line, even where the browser cuts it) against the box's fractional width:
 * `scrollWidth` and `clientWidth` are rounded, and a line a fifth of a pixel too long reads as fitting while it is
 * already cut. A label whose box hugs its text measures exactly 1, so it never shrinks itself step by step (a copy laid
 * out apart differed by a rounding, and the box shrank with the text down to the smallest size).
 */
function lineOverflow(el: HTMLElement): number {
  const box = el.getBoundingClientRect().width;
  if (!box || typeof document === 'undefined' || !document.createRange) return el.scrollWidth / Math.max(1, el.clientWidth);
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect().width / box;
}

/** How far the web shrinks a text that does not fit, at most (as on a phone: `minimumFontScale`, else half). */
const MIN_SCALE = 0.5;

/**
 * The web has no `adjustsFontSizeToFit`: a label that fits on a phone by shrinking a little was cut with an ellipsis in a
 * browser (a narrow window, a long translation). Here the text is drawn at its own size and, while it overflows its box,
 * its font is stepped down until it fits, as a phone does. Done on the element itself after each layout, so it never
 * costs a render; a size change of the box (a resized window) fits it again.
 */
const WebFitText = React.forwardRef<Ref, TextProps>(({ style, minimumFontScale, ...rest }, ref) => {
  const own = useRef<Ref | null>(null);
  const base = (StyleSheet.flatten(style)?.fontSize as number | undefined) ?? 14;
  const min = Math.max(0.2, minimumFontScale || MIN_SCALE);

  const fit = useRef(() => {});
  fit.current = () => {
    const el = own.current as unknown as HTMLElement | null;
    if (!el || !el.style) return;
    el.style.fontSize = `${base}px`;
    if (!el.clientWidth) return;
    let scale = 1;
    for (let i = 0; i < 12 && scale > min; i++) {
      // Strict: a single pixel over the box is enough for the browser to draw an ellipsis.
      const across = rest.numberOfLines === 1 ? lineOverflow(el) : el.scrollWidth / el.clientWidth;
      const down = el.scrollHeight / Math.max(1, el.clientHeight + 1);
      if (across <= 1.001 && down <= 1) break;
      const over = Math.max(across, down);
      // One line shrinks in proportion to its width; a wrapped block more gently, as fewer words move between lines.
      scale = Math.max(min, scale * (rest.numberOfLines === 1 ? Math.min(0.97, 1 / over) : 0.93));
      el.style.fontSize = `${base * scale}px`;
    }
  };

  useLayoutEffect(() => {
    fit.current();
  });
  useLayoutEffect(() => {
    const el = own.current as unknown as HTMLElement | null;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = el.clientWidth;
    const watch = new ResizeObserver(() => {
      // Only a new width of the box asks for a new fit (the font change itself alters the height).
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit.current();
    });
    watch.observe(el);
    // The game's typeface may arrive after the first fit, with wider letters.
    (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready.then(() => fit.current());
    return () => watch.disconnect();
  }, []);

  return (
    <RNText
      ref={node => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      style={style}
      {...rest}
    />
  );
});
WebFitText.displayName = 'WebFitText';
