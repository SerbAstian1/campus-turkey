/** Become a representative. Ported from site/Pages.jsx. */

import { Accordion, BrandDivider, Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal, TimelineTrack, ASSETS } from "@/ds";
import { representative, representativeSteps } from "@/content";
import { ImagePlaceholder, scrollToId } from "@/components/Common";
import { IconCard, PageBody, PageHero, PriceTable, FaqLayout, splitStyle } from "./shared";
import { PartnerForm } from "./PartnerForm";
import { CardGrid } from "@/components/CardGrid";

export default function Representative() {
  const r = representative;
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero badge="Territories open in 9 countries" eyebrow="Country representatives" title="Become a Representative"
        lead="Hold an exclusive country or region for Campus Turkey. You recruit locally, we handle admissions, visas and everything inside Türkiye."
        actions={<Button variant="onDark" size="lg" onClick={() => scrollToId("rep-form")}>Apply for a territory</Button>} />

      <PageBody>
        <CardGrid min={260} gap="var(--space-6)">
          {r.benefits.map((b, i) => (
            <ScrollReveal key={b.title} delay={i * 70} style={{ display: "flex" }}><IconCard {...b} /></ScrollReveal>
          ))}
        </CardGrid>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="How to join" title="Four steps to a territory" /></ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={representativeSteps} /></ScrollReveal>
        </div>

        <div className="ct-split" style={splitStyle}>
          <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow="Who we appoint" title="What we ask of you" />
            <Card padding="var(--space-8)" surface="tinted" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {r.requirements.map((q) => (
                <span key={q} style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--fs-body-sm)", color: "var(--green-800)" }}>
                  <Icon name="check" size={17} strokeWidth={2.5} color="var(--green-500)" />{q}
                </span>
              ))}
            </Card>
            <ImagePlaceholder slot="rep-office" label="Representative office or fair stand photography" ratio="4 / 3" />
          </ScrollReveal>

          <ScrollReveal delay={80} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow="Earnings" title="What you are paid" />
            <PriceTable columns={["Referral type", "Commission", "When it is paid"]} rows={r.earnings.map((e) => [...e])} />
            <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
              Exact rates are written into your agreement and reviewed every year. Nothing depends on a verbal promise.
            </p>
          </ScrollReveal>
        </div>

        <div id="rep-form" className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,380px) 1fr", gap: "var(--space-12)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <SectionHeading eyebrow="Application" title="Apply for your territory"
              lead="Tell us which country you want. We reply within one working day with availability." />
            <BrandDivider />
            <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>Currently open: Nigeria, Ghana, Kenya, Tanzania, Morocco, Egypt, Pakistan, Bangladesh and Indonesia.</span>
          </div>
          <PartnerForm kinds={["Education agency", "Independent consultant", "Travel agency", "Migration consultancy"]}
            submitLabel="Apply for a territory"
            intro="One representative per territory. If your country is already taken we will tell you straight away rather than leave you waiting." />
        </div>

        <FaqLayout heading={<ScrollReveal><SectionHeading eyebrow="Questions" title="Representative FAQs" /></ScrollReveal>}>
          <ScrollReveal delay={80}><Accordion items={r.faq} /></ScrollReveal>
        </FaqLayout>

        <ScrollReveal>
          <CTABanner eyebrow="Next step" title="Check whether your country is open"
            body="One message tells you whether the territory is available and what the target would be."
            primaryLabel="Contact us" primaryHref="#/contact" secondaryLabel="Become a Partner" secondaryHref="#/partners" assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
