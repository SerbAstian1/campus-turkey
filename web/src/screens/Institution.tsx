"use client";

/**
 * Institution landing page. Ported from site/Pages.jsx.
 *
 * The prototype's own comment applies unchanged: falling back to another institution's
 * page silently served the wrong content for a year-old link. An unknown slug is a
 * broken address and should say so.
 */

import { Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal, StatBlock, ASSETS } from "@/ds";
import { getInstitution } from "@/content";
import { institutionPhoto } from "@/content/institution-photos";
import { EditorialImage, EditorialSplit } from "@/components/Editorial";
import { go, useHref } from "@/app/router";
import { IconCard, PageBody, PageHero } from "./shared";
import { useT } from "@/i18n/context";
import { translateContent, INSTITUTION_KEYS } from "@/i18n/content";
import { ErrorScreen } from "./Errors";
import { CardGrid } from "@/components/CardGrid";

export default function Institution({ slug }: { slug: string }) {
  const href = useHref();
  const t = useT();
  const raw = getInstitution(slug);
  if (!raw) return <ErrorScreen state="notFound" />;
  const inst = translateContent(raw, t, INSTITUTION_KEYS);
  const photo = institutionPhoto(inst.slug)!;

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow={inst.eyebrow} title={inst.title} lead={inst.lead}
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => go("contact")}>{inst.cta}</Button>
            <Button variant="outlineOnDark" size="lg" icon="handshake" onClick={() => go("partners")}>{t("Partnership terms")}</Button>
          </>
        } />

      <PageBody>
        <CardGrid min={200} gap="var(--space-10)">
          {inst.stats.map((st, i) => (
            <ScrollReveal key={st.label} delay={i * 60}><StatBlock {...st} theme="light" /></ScrollReveal>
          ))}
        </CardGrid>

        <ScrollReveal>
          <EditorialSplit
            tone="tinted"
            reverse
            media={
              <EditorialImage
                slot={`inst-${inst.slug}`}
                src={photo.src}
                alt={photo.alt}
                ratio="16 / 11"
                credit={photo}
              />
            }
          >
            <SectionHeading eyebrow={t("Scope of work")} title={t("What we deliver")} />
            <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {inst.list.map((l) => (
                <span key={l} style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>
                  <Icon name="check" size={17} strokeWidth={2.5} color="var(--green-500)" />{l}
                </span>
              ))}
            </Card>
          </EditorialSplit>
        </ScrollReveal>

        <CardGrid min={280} gap="var(--space-6)">
          {inst.points.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 70} style={{ display: "flex" }}><IconCard {...p} /></ScrollReveal>
          ))}
        </CardGrid>

        <ScrollReveal>
          <CTABanner eyebrow={t("Work with us")} title={inst.cta}
            body={t("A 30 minute call is enough to see whether this fits. We come prepared with numbers.")}
            primaryLabel={t("Book a Consultation")} primaryHref={href("contact")} secondaryLabel={t("Become a Partner")} secondaryHref={href("partners")} assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
