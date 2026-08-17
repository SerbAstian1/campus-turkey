"use client";

/** Study in Türkiye. Ported from site/Study.jsx. */

import { Accordion, Badge, BrandDivider, Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal, TimelineTrack, ASSETS } from "@/ds";
import { useT } from "@/i18n/context";
import { generalFaq, journey, scholarships, studentLife } from "@/content";
import { go, useHref } from "@/app/router";
import { IconCard, PageBody, PageHero, FaqLayout, StudentLifeFrames } from "./shared";
import { CardGrid } from "@/components/CardGrid";

/** A hook, not a module constant — see the note in About.tsx. */
function useWhy() {
  const t = useT();

  return [
    { icon: "wallet", title: t("Cost you can plan for"), body: t("Public tuition from $600 a year and living costs from $350 a month. We give you the full number before you commit.") },
    { icon: "globe", title: t("Degrees recognised worldwide"), body: t("Turkish universities sit in global rankings and follow the European credit system, so your degree travels.") },
    { icon: "languages", title: t("Study in English"), body: t("Hundreds of programs are taught fully in English. Turkish-taught programs come with a preparatory language year.") },
    { icon: "plane-landing", title: t("Straightforward visas"), body: t("Student visas are issued on an acceptance letter. We prepare the file and book the appointment.") },
    { icon: "map-pinned", title: t("40 cities to choose from"), body: t("Istanbul, Ankara, Izmir, Antalya and beyond. Coastal, capital or campus town, whichever suits you.") },
    { icon: "users", title: t("300,000 international students"), body: t("You will not be the only one from your country. We introduce you before you fly.") },
  ];
}

export default function Study() {
  const href = useHref();
  const t = useT();
  const why = useWhy();
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        badge={t("Applications open for the 2026 intake")}
        eyebrow={t("Our core service")}
        title={t("Study in Türkiye")}
        lead={t("Admission, scholarships, visa and arrival, handled by one team. You get real tuition figures and real deadlines before you decide anything.")}
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>{t("Apply Now")}</Button>
            <Button variant="outlineOnDark" size="lg" icon="landmark" onClick={() => go("universities")}>{t("Browse the directory")}</Button>
          </>
        }
      />

      <PageBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow={t("Why Türkiye")} title={t("Six reasons students choose it")}
              lead={t("Quality education at a cost that works, in a country that already hosts hundreds of thousands of international students.")} />
          </ScrollReveal>
          <CardGrid min={260} gap="var(--space-6)">
            {why.map((w, i) => (
              <ScrollReveal key={w.title} delay={i * 60} style={{ display: "flex" }}><IconCard {...w} /></ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
            <SectionHeading eyebrow={t("Scholarships")} title={t("What you can actually get")}
              lead={t("Four routes to a lower fee. We tell you which ones you qualify for before you spend anything.")} />
            {/* Out to the spoke, not to the form. The hub's job is to route; sending
                somebody straight to "apply" from a section they are still reading skips
                the page that answers what they were reading it for. */}
            <Button variant="secondary" icon="arrow-right" onClick={() => go("study-in-turkiye/scholarships")}>
              {t("Compare all four")}
            </Button>
          </ScrollReveal>
          <CardGrid min={280} gap="var(--space-6)">
            {scholarships.map((s, i) => (
              <ScrollReveal key={s.name} delay={i * 60} style={{ display: "flex" }}>
                <Card padding="var(--space-8)" surface={i === 0 ? "tinted" : "plain"} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", alignItems: "flex-start" }}>
                    <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{s.name}</h3>
                    {i === 0 ? <Badge tone="brand" icon="award">{t("Full ride")}</Badge> : null}
                  </div>
                  <p style={{ color: "var(--text-body)", margin: 0 }}>{s.who}</p>
                  <BrandDivider />
                  {([[t("Covers"), s.covers], [t("Timing"), s.when], [t("Your odds"), s.competitive]] as const).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span className="ct-eyebrow">{k}</span>
                      <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{v}</span>
                    </div>
                  ))}
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
            <SectionHeading eyebrow={t("Application process")} title={t("What happens, in order")}
              lead={t("Five steps from first message to first week on campus.")} />
            <Button variant="secondary" icon="arrow-right" onClick={() => go("study-in-turkiye/application-process")}>
              {t("What to have ready")}
            </Button>
          </ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={journey} /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
            <SectionHeading eyebrow={t("Student life")} title={t("What a month actually costs")}
              lead={t("Real figures from students we placed this year. Budget about $350 to $550 a month in most cities.")} />
            <Button variant="secondary" icon="arrow-right" onClick={() => go("study-in-turkiye/student-life")}>
              {t("See it added up")}
            </Button>
          </ScrollReveal>
          <CardGrid min={250} gap="var(--space-6)">
            {studentLife.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 60} style={{ display: "flex" }}>
                <Card padding="var(--space-8)" style={{ width: "100%", display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
                  <Icon name={s.icon} size={20} color="var(--green-600)" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{s.title}</h3>
                    <p style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)", margin: 0 }}>{s.body}</p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>
          {/* The reveal wraps the grid rather than being it: `ScrollReveal` animates a
              transform on its own element, and an element that is both the animated
              subject and the grid container gets its columns recalculated on every
              frame of that animation. */}
          <ScrollReveal delay={80}>
            <StudentLifeFrames />
          </ScrollReveal>
        </div>

        <FaqLayout heading={
          <ScrollReveal><SectionHeading eyebrow={t("Questions")} title={t("Student FAQs")} lead={t("Anything else, message us on WhatsApp.")} /></ScrollReveal>
        }>
          <ScrollReveal delay={80}><Accordion items={generalFaq} /></ScrollReveal>
        </FaqLayout>

        <ScrollReveal>
          <CTABanner eyebrow={t("Next step")} title={t("Apply for the 2026 intake")}
            body={t("One short form. We reply with a shortlist, real tuition and the scholarships you qualify for.")}
            primaryLabel={t("Apply Now")} primaryHref={href("apply")} secondaryLabel={t("Book a Consultation")} secondaryHref={href("contact")} assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
