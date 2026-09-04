/**
 * The holding screen shown while the design system bundle is still in flight.
 *
 * Lives in `src/` rather than beside the provider in `app/` because two callers need it
 * now — `DesignSystemBoundary` for the portal and staff areas, and `Hydrated` for the
 * public pages — and `src/` is the direction imports already run. A module in `src/`
 * reaching back into `app/` would be the first edge the other way, and boundaries erode
 * from exactly one exception. Same reasoning as `src/ds/status.tsx`.
 *
 * Inline styles rather than a class: this renders before the design system's tokens are
 * guaranteed to have been applied, so it cannot depend on them.
 */

export function BootScreen() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A2C1E",
      }}
    >
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Loading Campus Turkey
      </span>
      <img
        src="/assets/logo-lockup-reversed.png"
        alt=""
        width={220}
        height={97}
        style={{ height: 104, width: "auto", opacity: 0.92 }}
      />
    </div>
  );
}
