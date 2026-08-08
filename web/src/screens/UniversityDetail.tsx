"use client";

/**
 * University detail. Ported from site/Directory.jsx.
 *
 * One departure from the prototype, kept from the earlier pass: an unknown slug renders
 * a real not-found rather than silently falling back to the first university, which
 * served the wrong page for any stale link.
 */

import { BrandDivider, Badge, Button, Card, Icon, ScrollReveal, Tag, UniversityCard } from "@/ds";
import { getUniversity, universities } from "@/content";
import { ImagePlaceholder } from "@/components/Common";
import { go } from "@/app/router";
import { Facts } from "./shared";
import { ErrorScreen } from "./Errors";
import { CardGrid } from "@/components/CardGrid";

export default function UniversityDetail({ slug }: { slug: string | null }) {
  const u = slug ? getUniversity(slug) : undefined;
  if (!u) return <ErrorScreen state="notFound" />;

  const similar = universities
    .filter((x) => x.slug !== u.slug && (x.city === u.city || x.type === u.type))
    .slice(0, 3);

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <section style={{ background: "var(--gradient-brand-deep)", paddingTop: 150, paddingBottom: "calc(var(--section-y) + 40px)", marginBottom: "calc(var(--overlap) * -1)" }}>
        <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <button type="button" onClick={() => go("universities")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,.78)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", cursor: "pointer", width: "fit-content", padding: 0 }}>
            <Icon name="arrow-left" size={16} /> All universities
          </button>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Badge tone="onDark" icon="map-pin">{u.city}</Badge>
            <Badge tone="onDark">{u.type}</Badge>
            {u.scholarship ? <Badge tone="onDark" icon="award">Scholarships available</Badge> : null}
          </div>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", maxWidth: "18ch", margin: 0 }}>{u.name}</h1>
          <p style={{ color: "rgba(255,255,255,.86)", fontSize: "var(--fs-lead)", maxWidth: 620, margin: 0 }}>{u.ranking}. Taught in {u.languages.join(" and ")}.</p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)", alignItems: "center" }}>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>Apply Now</Button>
            <Button variant="outlineOnDark" size="lg" icon="calendar-check" onClick={() => go("contact")}>Book a Consultation</Button>
          </div>
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
        <div className="ct-container ct-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px,340px)", gap: "var(--space-12)", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
            <ScrollReveal><ImagePlaceholder slot={`campus-${u.slug}`} label={`${u.name} campus photography, 16:9`} ratio="16 / 9" /></ScrollReveal>

            <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>About the university</h2>
              <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0 }}>{u.about}</p>
              <BrandDivider />
              <Facts items={[["Founded", u.founded], ["Students", u.students], ["Programs", u.programs], ["Tuition", u.tuition]]} />
            </ScrollReveal>

            <ScrollReveal delay={80} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Popular faculties</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                {u.faculties.map((f) => <Tag key={f}>{f}</Tag>)}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={160} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Dates for the 2026 intake</h2>
              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {u.deadlines.map(([k, v], i) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-6)", flexWrap: "wrap", paddingTop: i ? "var(--space-4)" : 0, borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{k}</span>
                    <span style={{ color: "var(--text-body)" }}>{v}</span>
                  </div>
                ))}
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={200} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Similar universities</h2>
              <CardGrid min={220} gap="var(--space-5)">
                {similar.map((s) => (
                  <UniversityCard key={s.slug} name={s.name} city={s.city} type={s.type} languages={s.languages}
                    tuition={s.tuition} scholarship={s.scholarship} programs={s.programs}
                    href={`#/university/${s.slug}`} style={{ width: "100%" }} />
                ))}
              </CardGrid>
            </ScrollReveal>
          </div>

          <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">Yearly tuition</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h1)", lineHeight: 1, color: "var(--green-700)" }}>{u.tuition}</span>
              <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: 0 }}>
                Living costs in {u.city} run about $350 to $550 per month, including housing.
              </p>
              <Button variant="primary" size="lg" fullWidth onClick={() => go("apply")}>Apply Now</Button>
              <Button variant="secondary" fullWidth icon="calendar-check" onClick={() => go("contact")}>Book a Consultation</Button>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>We confirm the exact fee with the university before you pay anything.</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
