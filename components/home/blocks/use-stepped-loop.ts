import * as React from "react";

/**
 * Stepped auto-advance with a seamless forward-only wrap. `index` runs from 0
 * to `count` inclusive: position `count` shows the cloned head the consumer
 * renders after the real items, and once the glide into it finishes we snap
 * (unanimated) back to the identical-looking real start — so the carousel
 * never visibly rewinds. Pass `count` = 0 to disable entirely.
 *
 * Honors prefers-reduced-motion (never advances). Pause/resume are for
 * hover/focus so viewers can interact without the track moving under them.
 */
export function useSteppedLoop(count: number, stepMs: number, glideMs: number) {
  const [index, setIndex] = React.useState(0);
  const [animate, setAnimate] = React.useState(true);
  const pausedRef = React.useRef(false);

  // Advance one step per interval; hold at the cloned head until snap-back.
  React.useEffect(() => {
    if (count < 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i >= count ? i : i + 1));
    }, stepMs);
    return () => clearInterval(timer);
  }, [count, stepMs]);

  // Once the glide into the cloned head has finished, snap back to the start.
  React.useEffect(() => {
    if (count < 1 || index < count) return;
    const timer = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, glideMs + 100);
    return () => clearTimeout(timer);
  }, [index, count, glideMs]);

  // Re-enable the transition on the frame after the snap has painted.
  React.useEffect(() => {
    if (animate) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnimate(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const pause = React.useCallback(() => {
    pausedRef.current = true;
  }, []);
  const resume = React.useCallback(() => {
    pausedRef.current = false;
  }, []);

  return { index, animate, pause, resume };
}
