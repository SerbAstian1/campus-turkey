"use client";

/**
 * Shared pieces the design system does not provide. Ported from site/Common.jsx with
 * the same geometry and the same behaviour.
 */

import { useState, type CSSProperties } from "react";
import { Icon, Logo, ASSETS } from "@/ds";
import { useT } from "@/i18n/context";

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
  label, tone = "brand", size = 56, fixed = false, style,
}: {
  label?: string;
  tone?: "brand" | "onDark";
  size?: number;
  fixed?: boolean;
  style?: CSSProperties;
}) {
  const t = useT();
  const [hover, setHover] = useState(false);
  // A default parameter cannot call `t()` — it is evaluated where no hook exists.
  const text = label ?? t("Chat on WhatsApp");
  const dark = tone === "onDark";
  const disc = size - 10;

  return (
    <a
      href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" aria-label={text}
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
        {text}
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
 * A photography frame: the real image when one exists, the reserved placeholder when it
 * does not.
 *
 * `slot` is the stable name for the frame and stays the identity of the thing whether or
 * not a photograph has arrived — it is emitted as `data-slot` so every frame is findable
 * in the DOM, in the IDE and in the image manifest.
 *
 * Both states live in one component on purpose. Photography arrives a few pictures at a
 * time, from different universities and different shoots, and the alternative is
 * editing thirty call sites twice: once to swap the placeholder for an `<img>`, and
 * again for whichever ones the licensing did not come through for. Passing `src` is the
 * whole change; layout, ratio and rounding are already agreed and do not move.
 *
 * `alt` is required alongside `src` and deliberately not defaulted. A campus photograph
 * is content, not decoration, and a default would quietly produce thirty images
 * described as "Photography" to a screen reader. Pass `alt=""` to mark one genuinely
 * decorative — that is a decision worth making per image rather than inheriting.
 */
export function ImagePlaceholder({
  slot, label, ratio = "4 / 3", height, icon = "image", round, style,
  src, alt, priority,
}: {
  slot: string;
  label?: string;
  ratio?: string;
  height?: number | string;
  icon?: string;
  round?: boolean;
  style?: CSSProperties;
  /** The photograph. Absent until one is licensed and delivered. */
  src?: string;
  /** Required with `src`. `""` marks the image decorative. */
  alt?: string;
  /** Above the fold: load eagerly and at high priority. Everything else stays lazy. */
  priority?: boolean;
}) {
  if (src) {
    return (
      <img
        data-slot={slot}
        src={src}
        alt={alt ?? ""}
        /*
         * Lazy and low-priority unless the caller says otherwise. Most of these frames
         * are far down long marketing pages, and the hero heading is the LCP element on
         * every one of them — a campus photograph competing for that is a slower page
         * for no benefit.
         */
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        style={{
          // Matches the placeholder's box exactly, so a frame does not resize on the day
          // its photograph arrives and no layout shifts under it.
          aspectRatio: height ? undefined : ratio,
          height,
          width: "100%",
          objectFit: "cover",
          borderRadius: round ? "var(--radius-circle)" : "var(--radius-lg)",
          display: "block",
          ...style,
        }}
      />
    );
  }

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
