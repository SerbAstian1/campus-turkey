"use client";

/**
 * Whether the design system bundle has resolved.
 *
 * Lives in `src/ds/` rather than beside the provider in `app/` so that imports keep
 * running one way. `app/` already imports from `src/`; a module in `src/` reaching back
 * into `app/` would be the first edge in the other direction, and boundaries erode from
 * exactly one exception.
 *
 * The value is `loading` on the server and on the first client render, always. Consumers
 * therefore render the same thing in both places, which is what lets hydration match
 * before the bundle changes anything.
 */

import { createContext, useContext } from "react";

export type DesignSystemStatus = "loading" | "ready" | "failed";

export const DesignSystemStatusContext = createContext<DesignSystemStatus>("loading");

export function useDesignSystemStatus(): DesignSystemStatus {
  return useContext(DesignSystemStatusContext);
}
