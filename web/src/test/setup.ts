/**
 * Shared test setup for both environments.
 *
 * The server suites run under `node` and the frontend suites under `jsdom`
 * (`environmentMatchGlobs` in vitest.config.ts). Vitest applies one `setupFiles` list to
 * every test, so everything below is behind a `window` check — without it, the server
 * suites fail at import on `window.matchMedia`.
 */
const isBrowserLike = typeof window !== "undefined";

if (isBrowserLike) {
  await import("@testing-library/jest-dom/vitest");
}

/**
 * jsdom implements no layout, so it ships neither IntersectionObserver nor
 * matchMedia — and every screen mounts Framer's `whileInView`, which needs the first,
 * and the motion layer reads the second.
 *
 * The observer stub reports each target as immediately visible. That is the right
 * default here: a reveal animation should never be what decides whether content is in
 * the document, so tests assert against the revealed state.
 */

class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = Object.freeze([0]);

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element): void {
    this.callback(
      [{
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        time: 0,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry],
      this,
    );
  }

  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

if (isBrowserLike) {
  globalThis.IntersectionObserver =
    ImmediateIntersectionObserver as unknown as typeof IntersectionObserver;

  /* Nothing under test asks for reduced motion, so the query always answers "no". */
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
}

export {};
