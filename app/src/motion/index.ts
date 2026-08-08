/**
 * Motion engineering — engine assignment and the rules that keep it cheap.
 *
 * Two engines, split by what they are good at rather than by preference:
 *
 *   Framer Motion  Component state: mount and unmount, layout changes, drawers,
 *                  sheets, presence. It owns anything React re-renders.
 *   GSAP           Scroll-driven and timeline work: section reveals, counters,
 *                  sequenced hero copy. It owns anything tied to scroll position.
 *
 * Both are code-split into the `motion` chunk by vite.config.ts, so neither lands in
 * the initial bundle. Import from this file rather than from the libraries directly;
 * that keeps the engine choice reviewable in one place.
 */

/** Durations in seconds. Matched to the prototype's CSS custom properties. */
export const DUR = {
  /** Hover, focus, small state flips. Below 120ms reads as instant. */
  fast: 0.16,
  /** The default. Reveals, dropdowns, tab switches. */
  base: 0.28,
  /** Panels and sheets travelling a long distance. */
  slow: 0.5,
  /** Page transitions. Long enough to register, short enough not to gate reading. */
  page: 0.5,
} as const;

/**
 * A single expressive curve, used everywhere. Fast out of the gate, long settle.
 * One curve across a product is what makes motion feel authored rather than assembled.
 *
 * Three spellings of one curve, one per consumer. GSAP parses neither the bezier array
 * nor the CSS string — without the CustomEase plugin it silently falls back to its own
 * default — so it gets the named ease that matches: [0.16, 1, 0.3, 1] is easeOutExpo.
 */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const EASE_CSS = "cubic-bezier(.16,1,.3,1)";
export const EASE_GSAP = "expo.out";

/** True when the visitor has asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Page transition. Transform only, deliberately: animating opacity means the computed
 * value is 0 at frame 0, so anything that restarts the animation without running it —
 * a backgrounded tab, a DOM clone built for a screenshot — renders the page invisible.
 * This exact bug shipped in the prototype and was fixed the same way.
 */
export const pageTransition = {
  initial: { y: 10 },
  animate: { y: 0 },
  transition: { duration: DUR.page, ease: EASE },
} as const;

/** Section reveal. Distance is small on purpose; large travel reads as a page jump. */
export const revealUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -12% 0px" },
  transition: { duration: DUR.base, ease: EASE },
} as const;

/** Stagger for a group of siblings. Cap the delay so long lists do not crawl. */
export function stagger(index: number, step = 0.08, max = 0.4) {
  return Math.min(index * step, max);
}
