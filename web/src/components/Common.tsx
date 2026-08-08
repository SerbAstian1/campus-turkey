"use client";

/**
 * Shared pieces the design system does not provide. Ported from site/Common.jsx with
 * the same geometry and the same behaviour.
 */

import { useState, type CSSProperties } from "react";
import { Icon, Logo, ASSETS } from "@/ds";

/**
 * Brand artwork is never recoloured. The mark always sits on a brand-green field:
 * primary green for the light, dark green for the depth.
 */
export function BrandMark({
  size = 88, radius = "var(--radius-lg)", style,
}: {
  size?: number;
  radius?: string;
  style?: CSSProperties;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: radius, flex: "none",
      background: "linear-gradient(150deg, var(--green-500) 0%, var(--green-700) 62%, var(--green-800) 100%)",
      boxShadow: "var(--shadow-md)", ...style,
    }}>
      <Logo variant="mark" theme="reversed" height={Math.round(size * 0.62)} assetBase={ASSETS} />
    </span>
  );
}

export function BrandLockup({ height = 92, style }: { height?: number; style?: CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "var(--space-6) var(--space-8)", borderRadius: "var(--radius-lg)",
      background: "linear-gradient(150deg, var(--green-500) 0%, var(--green-700) 62%, var(--green-800) 100%)",
      boxShadow: "var(--shadow-md)", ...style,
    }}>
      <Logo variant="lockup" theme="reversed" height={height} assetBase={ASSETS} />
    </span>
  );
}

const WHATSAPP_HREF =
  `https://wa.me/905550000000?text=${encodeURIComponent("Hello Campus Turkey, I have a question.")}`;

/**
 * WhatsApp action. Default state is the icon disc alone; hover reveals the label in the
 * site's pill button geometry. Never fixed to the viewport unless asked.
 */
export function WhatsAppAction({
  label = "Chat on WhatsApp", tone = "brand", size = 56, fixed = false, style,
}: {
  label?: string;
  tone?: "brand" | "onDark";
  size?: number;
  fixed?: boolean;
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const dark = tone === "onDark";
  const disc = size - 10;

  return (
    <a
      href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" aria-label={label}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      style={{
        position: fixed ? "fixed" : "relative",
        bottom: fixed ? 96 : undefined, insetInlineEnd: fixed ? 24 : undefined, zIndex: fixed ? 80 : undefined,
        display: "inline-flex", alignItems: "center", flex: "none", justifyContent: "flex-end",
        height: size, width: hover ? "auto" : size, borderRadius: "var(--radius-pill)",
        padding: hover ? `0 ${size - 12}px 0 ${size + 4}px` : 0,
        background: dark ? "var(--white)" : "var(--action-primary)",
        color: dark ? "var(--green-900)" : "var(--white)",
        fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)",
        whiteSpace: "nowrap", textDecoration: "none", overflow: "hidden",
        boxShadow: hover ? "var(--shadow-float)" : "var(--shadow-md)",
        transition: "padding var(--dur-slow) var(--ease-out), background var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
        ...style,
      }}
    >
      <span className="ct-wa-label" style={{ opacity: hover ? 1 : 0, transition: "opacity var(--dur-base) var(--ease-out)" }}>
        {label}
      </span>
      <span style={{
        position: "absolute", top: 5, left: 5, width: disc, height: disc,
        borderRadius: "var(--radius-circle)", display: "flex", alignItems: "center", justifyContent: "center",
        background: dark ? "var(--action-primary)" : "rgba(255,255,255,.18)",
        border: dark ? "none" : "1px solid rgba(255,255,255,.3)", color: "var(--white)",
      }}>
        <Icon name="message-circle" size={Math.round(disc * 0.52)} strokeWidth={2.25} />
      </span>
    </a>
  );
}

/**
 * Frame reserved for photography the brand supplies later. `slot` is the stable name a
 * developer swaps for a real <img>; it is rendered as data-slot so each frame is
 * findable in the DOM and in the IDE.
 */
export function ImagePlaceholder({
  slot, label = "Photography", ratio = "4 / 3", height, icon = "image", round, style,
}: {
  slot: string;
  label?: string;
  ratio?: string;
  height?: number | string;
  icon?: string;
  round?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div data-slot={slot} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-3)",
      aspectRatio: height ? undefined : ratio, height, width: "100%",
      borderRadius: round ? "var(--radius-circle)" : "var(--radius-lg)", background: "var(--neutral-100)",
      border: "1px dashed var(--border-strong)", color: "var(--neutral-500)", textAlign: "center",
      padding: label ? "var(--space-5)" : 0, boxSizing: "border-box", overflow: "hidden",
      ...style,
    }}>
      <Icon name={icon} size={22} />
      {label ? <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)", letterSpacing: ".04em" }}>{label}</span> : null}
    </div>
  );
}

/** Smooth in-page scroll that clears the fixed navbar. */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 116;
  window.scrollTo({ top, behavior: "smooth" });
}
