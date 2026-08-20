"use client";

/**
 * A service page. Ported from site/Study.jsx (ServiceScreen).
 *
 * As on the university detail screen, an unknown slug is a real not-found rather than a
 * silent fall back to Medical Tourism.
 */

import { Accordion, Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal, StatBlock, Tag, TimelineTrack, ASSETS } from "@/ds";
import { getService, services } from "@/content";
import { ImagePlaceholder } from "@/components/Common";
import { go, useHref } from "@/app/router";
import { IconCard, PageBody, PageHero, PriceTable, FaqLayout, splitStyle } from "./shared";
import { useT } from "@/i18n/context";
import { servicePhoto } from "@/content/service-photos";
import { PhotoCredit } from "@/components/PhotoCredit";
import { ErrorScreen } from "./Errors";
import { CardGrid } from "@/components/CardGrid";

export default function Service({ slug }: { slug: string }) {
  const t = useT();
  const href = useHref();
  const s = getService(slug);
  const photo = servicePhoto(slug);
  if (!s) return <ErrorScreen state="notFound" />;

  const others = services.filter((o) => o.slug !== s.slug);

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow={s.eyebrow} title={s.title} lead={s.lead}
        actions={<Button variant="onDark" size="lg" onClick={() => go("contact")}>{s.cta}</Button>} />

      <PageBody>
        <CardGrid min={200} gap="var(--space-10)">
          {s.stats.map((st, i) => (
            <ScrollReveal key={st.label} delay={i * 60}><StatBlock {...st} theme="light" /></ScrollReveal>
          ))}
        </CardGrid>

        <CardGrid min={280} gap="var(--space-6)">
          {s.points.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 70} style={{ display: "flex" }}><IconCard {...p} /></ScrollReveal>
          ))}
        </CardGrid>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow={t("How it works")} title={t("{service} step by step", { service: s.title })}
              lead={t("Five stages, and you always know which one you are in.")} />
          </ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={s.steps} /></ScrollReveal>
        </div>

        <div className="ct-split" style={splitStyle}>
          <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow={t("Scope")} title={t("What is included, and what is not")} />
            {s.includes.map((group, gi) => (
              <Card key={group.title} padding="var(--space-8)" surface={gi === 0 ? "tinted" : "plain"} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{group.title}</h3>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {group.items.map((it) => (
                    <li key={it} style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>
                      <Icon name={gi === 0 ? "check" : "minus"} size={16} strokeWidth={2.5} color={gi === 0 ? "var(--green-500)" : "var(--neutral-400)"} />{it}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </ScrollReveal>

          <ScrollReveal delay={80} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow={t("Indicative prices")} title={t("What people usually pay")} />
            <PriceTable columns={["Service", "Typical price", "Time needed"]} rows={s.pricing.map((p) => [p.item, p.price, p.note])} />
            <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
              Indicative ranges from files we handled in the last twelve months. Your written quote is always specific to you.
            </p>
            {/*
              Keyed on the slug, not the title the slot uses: a slug is the stable
              identifier, while a title is copy and may be reworded.

              `alt` describes the picture rather than the service, because the heading
              above already names the service and a screen reader gains nothing from
              hearing it twice.
            */}
            <ImagePlaceholder slot={`service-${s.title}`} label={`${s.title} photography, 4:3`} ratio="4 / 3"
              {...(photo ? { src: photo.src, alt: photo.alt } : {})} />
            <PhotoCredit photo={photo} />
          </ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <ScrollReveal><SectionHeading eyebrow={t("Covered")} title={t("What we arrange")} /></ScrollReveal>
          <ScrollReveal delay={60} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
            {s.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <Card surface="inverse" padding="var(--space-10)" radius="var(--radius-xl)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <span className="ct-eyebrow" style={{ color: "var(--green-300)" }}>{t("Why people trust this desk")}</span>
            <CardGrid min={220} gap="var(--space-5)">
              {s.trust.map((t) => (
                <span key={t} style={{ display: "flex", gap: "var(--space-3)", color: "rgba(255,255,255,.9)", fontSize: "var(--fs-body-sm)" }}>
                  <Icon name="shield-check" size={18} color="var(--green-300)" />{t}
                </span>
              ))}
            </CardGrid>
          </Card>
        </ScrollReveal>

        <FaqLayout heading={
          <ScrollReveal><SectionHeading eyebrow={t("Questions")} title={t("{service} FAQs", { service: s.title })} lead={t("Ask us anything else on WhatsApp.")} /></ScrollReveal>
        }>
          <ScrollReveal delay={80}><Accordion items={s.faq} /></ScrollReveal>
        </FaqLayout>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <ScrollReveal><SectionHeading eyebrow={t("Other services")} title={t("What else we handle")} /></ScrollReveal>
          <CardGrid min={240} gap="var(--space-6)">
            {others.map((o, i) => (
              <ScrollReveal key={o.slug} delay={i * 60} style={{ display: "flex" }}>
                <Card interactive href={href(`service/${o.slug}`)} padding="var(--space-8)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <Icon name={o.icon} size={22} color="var(--green-600)" />
                  <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{o.title}</h3>
                  <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: 0 }}>{o.lead}</p>
                  <span style={{ marginTop: "auto", paddingTop: "var(--space-3)", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-600)" }}>
                    Open page <Icon name="arrow-right" size={15} />
                  </span>
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <ScrollReveal>
          <Card surface="tinted" padding="var(--space-10)" radius="var(--radius-xl)" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-8)", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ maxWidth: 520 }}>
              <span className="ct-eyebrow">{t("Remember")}</span>
              <h3 style={{ fontSize: "var(--fs-h2)", margin: "var(--space-2) 0 var(--space-3)" }}>{t("Education is our core service")}</h3>
              <p style={{ color: "var(--text-body)", margin: 0 }}>{t("If a family member wants to study in Türkiye, we handle that too, on the same file.")}</p>
            </div>
            <Button variant="primary" size="lg" onClick={() => go("study")}>{t("See Study in Türkiye")}</Button>
          </Card>
        </ScrollReveal>

        <ScrollReveal>
          <CTABanner eyebrow={t("Talk to us")} title={t("Get a written plan for {service}", { service: s.title.toLowerCase() })}
            body="Tell us what you need. You get a clear scope and a price before you travel."
            primaryLabel="Book a Consultation" primaryHref={href("contact")} secondaryLabel="Apply Now" secondaryHref={href("apply")} assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
