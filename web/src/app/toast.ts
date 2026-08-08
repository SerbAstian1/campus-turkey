"use client";

/**
 * Toast. Mirrors the prototype's `window.CT_TOAST`: one message at a time, 3.2 seconds.
 *
 * A module-level emitter rather than a context, because the portal's sheets render into
 * document.body through a React portal and the prototype calls this from plain event
 * handlers. Anything that can import this file can raise a toast.
 */

type Listener = (message: string | null) => void;

let listener: Listener | null = null;
let timer: number | null = null;

/** Registered by the shell. Only one toast surface exists. */
export function subscribeToToasts(fn: Listener): () => void {
  listener = fn;
  return () => {
    listener = null;
    if (timer) { clearTimeout(timer); timer = null; }
  };
}

export function toast(message: string): void {
  listener?.(message);
  if (timer) clearTimeout(timer);
  timer = window.setTimeout(() => {
    listener?.(null);
    timer = null;
  }, 3200);
}
