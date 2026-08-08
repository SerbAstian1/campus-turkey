import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, type RefObject } from "react";
import { DUR, EASE_GSAP, prefersReducedMotion } from "./index";

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP context scoped to a ref, with cleanup.
 *
 * Every GSAP call inside the callback is reverted when the component unmounts. Without
 * this, ScrollTriggers accumulate on every route change and eventually make scrolling
 * janky in a way that is very hard to trace back to its cause.
 */
export function useGsap(
  scope: RefObject<HTMLElement>,
  build: (ctx: gsap.Context) => void,
  deps: unknown[] = [],
) {
  useEffect(() => {
    if (!scope.current) return;
    const ctx = gsap.context(build, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Counts a number up when it scrolls into view. Reduced motion gets the final value
 * immediately rather than a shortened animation, because the request is for no motion,
 * not for faster motion.
 */
export function useCountUp(ref: RefObject<HTMLElement>, target: number, suffix = "") {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = `${target}${suffix}`;
      return;
    }
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: target,
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onUpdate: () => { el.textContent = `${Math.round(obj.n)}${suffix}`; },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [ref, target, suffix]);
}

/**
 * ScrollTrigger caches element positions. Anything that changes document height after
 * mount — a font swapping in, an image finally decoding, a filter collapsing a list —
 * leaves every trigger below it firing at the wrong scroll position. Call this after
 * such a change; it is the single most common cause of "the reveals fire too early".
 */
export function refreshScrollTriggers() {
  ScrollTrigger.refresh();
}

/** Sequenced hero entrance. Returns the timeline so a caller can pause or reverse it. */
export function heroTimeline(scope: HTMLElement) {
  if (prefersReducedMotion()) return null;
  const tl = gsap.timeline({ defaults: { ease: EASE_GSAP, duration: DUR.slow } });
  tl.from(scope.querySelectorAll("[data-hero-line]"), { y: 24, opacity: 0, stagger: 0.08 })
    .from(scope.querySelectorAll("[data-hero-cta]"), { y: 12, opacity: 0, stagger: 0.06 }, "-=0.28");
  return tl;
}
