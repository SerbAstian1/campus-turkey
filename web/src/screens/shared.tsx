"use client";

/**
 * Page furniture shared across screens. Ported from site/Study.jsx, where the prototype
 * defines these and hangs them on `window` for the other screen files to use.
 */

import type { CSSProperties, ReactNode } from "react";
import { Badge, Card, Icon, ASSETS } from "@/ds";
import { CardGrid } from "@/components/CardGrid";
import { ImagePlaceholder } from "@/components/Common";
import { PhotoCredit } from "@/components/PhotoCredit";
import { useT } from "@/i18n/context";

export function PageHero({
  eyebrow, title, lead, actions, badge,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  badge?: string;
}) {
  return (
    <section style={{ position: "relative", background: "var(--gradient-brand-deep)", paddingTop: 150, paddingBottom: "calc(var(--section-y) + 40px)", marginBottom: "calc(var(--overlap) * -1)", overflow: "hidden" }}>
      {/* Decorative, so it must not compete with the heading for the LCP. `low`
          deprioritises the fetch and `async` keeps the decode off the main thread;
          neither changes what is painted, only when it is paid for. */}
      <img src={`${ASSETS}/map-of-turkey.jpg`} alt="" aria-hidden="true"
        decoding="async" fetchPriority="low"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "soft-light", opacity: .32, filter: "invert(1)" }} />
      <div className="ct-container" style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-5)", alignItems: "flex-start" }}>
        {badge ? <span style={{ alignSelf: "flex-start" }}><Badge tone="onDark" dot>{badge}</Badge></span> : null}
        <span className="ct-eyebrow" style={{ color: "var(--green-200)" }}>{eyebrow}</span>
        <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", maxWidth: "20ch", margin: 0 }}>{title}</h1>
        <p style={{ color: "rgba(255,255,255,.88)", fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", maxWidth: 620, margin: 0 }}>{lead}</p>
        {actions ? <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)", alignItems: "center" }}>{actions}</div> : null}
      </div>
    </section>
  );
}

export function PageBody({
  children, background = "var(--surface-subtle)",
}: {
  children: ReactNode;
  background?: string;
}) {
  return (
    <section style={{ position: "relative", zIndex: 10, background, borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>{children}</div>
    </section>
  );
}

export function IconCard({
  icon, title, body, tone = "plain",
}: {
  icon: string;
  title: string;
  body: string;
  tone?: "plain" | "tinted" | "inverse";
}) {
  return (
    <Card padding="var(--space-8)" surface={tone} interactive style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--green-050)" }}>
        <Icon name={icon} size={21} color="var(--green-600)" />
      </span>
      <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{title}</h3>
      <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0 }}>{body}</p>
    </Card>
  );
}

export function PriceTable({ rows, columns }: { rows: (string | number)[][]; columns: string[] }) {
  return (
    <Card padding="0" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr" }}>
        {columns.map((c) => (
          <span key={c} className="ct-eyebrow" style={{ padding: "var(--space-5) var(--space-6)", background: "var(--green-050)", color: "var(--green-700)" }}>{c}</span>
        ))}
        {rows.map((r, i) => r.map((cell, j) => (
          <span key={`${i}-${j}`} style={{
            padding: "var(--space-5) var(--space-6)", borderTop: "1px solid var(--border-subtle)",
            fontFamily: "var(--font-ui)",
            fontWeight: j === 0 ? "var(--fw-medium)" : "var(--fw-regular)",
            fontSize: "var(--fs-body-sm)", color: j === 0 ? "var(--green-800)" : "var(--text-body)",
          }}>{cell}</span>
        )))}
      </div>
    </Card>
  );
}

export function Facts({ items }: { items: [string, string | number][] }) {
  return (
    <CardGrid min={150} gap="var(--space-6)">
      {items.map(([k, v]) => (
        <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="ct-eyebrow">{k}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h3)", color: "var(--text-heading)" }}>{v}</span>
        </div>
      ))}
    </CardGrid>
  );
}

/** The two-column FAQ block every screen repeats: sticky heading beside the accordion. */
export function FaqLayout({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return (
    <div className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) 1fr", gap: "var(--space-16)", alignItems: "start" }}>
      <div style={{ position: "sticky", top: 140 }}>{heading}</div>
      {children}
    </div>
  );
}

/**
 * The lecture room is the one frame here that is not the client's own photograph, so it is
 * the one that carries a credit. CC BY-SA licenses it only while the author and licence are
 * stated. It replaced a picture whose country could not be established — the brief for this
 * site is Türkiye, and a lecture hall that could be anywhere asserts nothing.
 */
const CAMPUS_LIFE_CREDIT = {
  author: "BSRF",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  source: "https://commons.wikimedia.org/wiki/File:%C4%B0zmir_Bak%C4%B1r%C3%A7ay_University_07.jpg",
};

/**
 * The three student-life photographs, rendered identically by the study hub and by the
 * student-life page beneath it.
 *
 * One definition rather than two matching blocks. The same three slots appear on both
 * pages and are meant to hold the same three pictures, so a photograph swapped in one
 * place is a photograph swapped in both — the alternative is two lists that drift, which
 * is the same reason the captcha hosts and the map tile hosts each live in one file.
 * These have already been re-sourced once.
 *
 * `alt` describes each picture rather than the frame it sits in. Without it
 * `ImagePlaceholder` falls back to `alt=""`, which marks a photograph decorative — wrong
 * for three images a section about where you live and what it costs uses as evidence.
 *
 * The housing and city sources are 3:2 in a 4:3 frame, so `objectFit: cover` trims their
 * top and bottom. The ratio stays as agreed rather than bending to the files.
 * `campus-life.webp` is a true 4:3 and fills its frame uncropped.
 *
 * `study-campus` was labelled "Campus life, students outdoors" while holding a lecture
 * hall. Nothing rendered wrong — the label is the placeholder's fallback text and never
 * appears beside a picture — but it is the shoot instruction that
 * `scripts/image-manifest.mjs` prints, so it would have asked a photographer for the one
 * thing this frame already has covered. The label now describes the photograph. Change it
 * back the day the picture becomes students outdoors, not before.
 */
export function StudentLifeFrames() {
  const t = useT();
  return (
    <CardGrid min={240} gap="var(--space-6)">
      <ImagePlaceholder slot="study-housing" src="/assets/student housing.jpg" label={t("Dormitory or student housing")} ratio="4 / 3"
        alt={t("A Turkish apartment building with balconies, a Turkish flag hanging from one of them and an orange tree in the foreground")} />
      <ImagePlaceholder slot="study-campus" src="/assets/campus-life.webp" label={t("Teaching, a full lecture hall")} ratio="4 / 3"
        alt={t("A tiered lecture room at a Turkish university, desks facing the front")} />
      <PhotoCredit photo={CAMPUS_LIFE_CREDIT} />
      <ImagePlaceholder slot="study-city" src="/assets/street-life.webp" label={t("City street, everyday costs")} ratio="4 / 3"
        alt={t("A busy city street with döner kebab and street-food counters, vendors in aprons serving customers and pedestrians walking past")} />
    </CardGrid>
  );
}

export const splitStyle: CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)", alignItems: "start",
};
