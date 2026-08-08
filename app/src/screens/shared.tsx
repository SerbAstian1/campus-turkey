/**
 * Page furniture shared across screens. Ported from site/Study.jsx, where the prototype
 * defines these and hangs them on `window` for the other screen files to use.
 */

import type { CSSProperties, ReactNode } from "react";
import { Badge, Card, Icon, ASSETS } from "@/ds";
import { CardGrid } from "@/components/CardGrid";

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
      <img src={`${ASSETS}/map-of-turkey.jpg`} alt="" aria-hidden="true"
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

export const splitStyle: CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)", alignItems: "start",
};
