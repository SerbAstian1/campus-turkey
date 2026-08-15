"use client";

/** Become a partner. Ported from site/Pages.jsx. */

import { BrandDivider, Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal, ASSETS } from "@/ds";
import { institutions, partnerBenefits } from "@/content";
import { scrollToId } from "@/components/Common";
import { go, useHref } from "@/app/router";
import { IconCard, PageBody, PageHero } from "./shared";
import { PartnerForm } from "./PartnerForm";
import { CardGrid } from "@/components/CardGrid";
import { useT } from "@/i18n/context";

export default function Partners() {
  const t = useT();
  const href = useHref();
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow="Partnerships" title="Become a partner"
        lead="Agencies, consultants, universities and hospitals work with us on published commission rates, with a portal that shows every student's real stage."
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => scrollToId("partner-form")}>Register now</Button>
            <Button variant="outlineOnDark" size="lg" icon="globe" onClick={() => go("representative")}>{t("Become a Representative")}</Button>
          </>
        } />

      <PageBody>
        <CardGrid min={260} gap="var(--space-6)">
          {partnerBenefits.map((b, i) => (
            <ScrollReveal key={b.title} delay={i * 70} style={{ display: "flex" }}><IconCard {...b} /></ScrollReveal>
          ))}
        </CardGrid>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow="For institutions" title="Four ways institutions work with us"
              lead="Each one has its own page, its own terms and its own named contact." />
          </ScrollReveal>
          <CardGrid min={240} gap="var(--space-6)">
            {institutions.map((inst, i) => (
              <ScrollReveal key={inst.slug} delay={i * 70} style={{ display: "flex" }}>
                <Card interactive href={href(`institutions/${inst.slug}`)} padding="var(--space-8)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <Icon name={inst.icon} size={22} color="var(--green-600)" />
                  <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{inst.title}</h3>
                  <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: 0 }}>{inst.lead}</p>
                  <span style={{ marginTop: "auto", paddingTop: "var(--space-3)", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-600)" }}>
                    Open page <Icon name="arrow-right" size={15} />
                  </span>
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <div id="partner-form" className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,380px) 1fr", gap: "var(--space-12)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <SectionHeading eyebrow="Registration" title="One form, one working day"
              lead="No fee to join. We reply with your agreement and portal access." />
            <BrandDivider />
            {([["Commission", "Published rates, paid in 30 days"], ["Territory", "Exclusive for representatives"], ["Support", "A named contact, not an inbox"]] as const).map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="ct-eyebrow">{k}</span>
                <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{v}</span>
              </div>
            ))}
          </div>
          <PartnerForm kinds={["Education agency", "Independent consultant", "University", "Hospital or clinic", "Chamber of commerce"]} />
        </div>

        <ScrollReveal>
          <CTABanner eyebrow="Already a partner" title="Sign in to your portal"
            body="Track every referral, download materials and check your payments."
            primaryLabel="Partner Login" primaryHref={href("portal")} secondaryLabel="Contact us" secondaryHref={href("contact")} assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
