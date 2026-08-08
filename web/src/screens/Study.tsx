"use client";

/** Study in Türkiye. Ported from site/Study.jsx. */

import { Accordion, Badge, BrandDivider, Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal, TimelineTrack, ASSETS } from "@/ds";
import { generalFaq, journey, scholarships, studentLife } from "@/content";
import { ImagePlaceholder } from "@/components/Common";
import { T } from "@/i18n/runtime";
import { go } from "@/app/router";
import { IconCard, PageBody, PageHero, FaqLayout } from "./shared";
import { CardGrid } from "@/components/CardGrid";

const WHY = [
  { icon: "wallet", title: "Cost you can plan for", body: "Public tuition from $600 a year and living costs from $350 a month. We give you the full number before you commit." },
  { icon: "globe", title: "Degrees recognised worldwide", body: "Turkish universities sit in global rankings and follow the European credit system, so your degree travels." },
  { icon: "languages", title: "Study in English", body: "Hundreds of programs are taught fully in English. Turkish-taught programs come with a preparatory language year." },
  { icon: "plane-landing", title: "Straightforward visas", body: "Student visas are issued on an acceptance letter. We prepare the file and book the appointment." },
  { icon: "map-pinned", title: "40 cities to choose from", body: "Istanbul, Ankara, Izmir, Antalya and beyond. Coastal, capital or campus town, whichever suits you." },
  { icon: "users", title: "300,000 international students", body: "You will not be the only one from your country. We introduce you before you fly." },
];

export default function Study() {
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        badge={T("hero.badge")}
        eyebrow="Our core service"
        title="Study in Türkiye"
        lead="Admission, scholarships, visa and arrival, handled by one team. You get real tuition figures and real deadlines before you decide anything."
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>{T("cta.apply")}</Button>
            <Button variant="outlineOnDark" size="lg" icon="landmark" onClick={() => go("universities")}>{T("cta.browse")}</Button>
          </>
        }
      />

      <PageBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow="Why Türkiye" title="Six reasons students choose it"
              lead="Quality education at a cost that works, in a country that already hosts hundreds of thousands of international students." />
          </ScrollReveal>
          <CardGrid min={260} gap="var(--space-6)">
            {WHY.map((w, i) => (
              <ScrollReveal key={w.title} delay={i * 60} style={{ display: "flex" }}><IconCard {...w} /></ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
            <SectionHeading eyebrow="Scholarships" title="What you can actually get"
              lead="Four routes to a lower fee. We tell you which ones you qualify for before you spend anything." />
            <Button variant="secondary" icon="arrow-right" onClick={() => go("apply")}>Check my eligibility</Button>
          </ScrollReveal>
          <CardGrid min={280} gap="var(--space-6)">
            {scholarships.map((s, i) => (
              <ScrollReveal key={s.name} delay={i * 60} style={{ display: "flex" }}>
                <Card padding="var(--space-8)" surface={i === 0 ? "tinted" : "plain"} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", alignItems: "flex-start" }}>
                    <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{s.name}</h3>
                    {i === 0 ? <Badge tone="brand" icon="award">Full ride</Badge> : null}
                  </div>
                  <p style={{ color: "var(--text-body)", margin: 0 }}>{s.who}</p>
                  <BrandDivider />
                  {([["Covers", s.covers], ["Timing", s.when], ["Your odds", s.competitive]] as const).map(([k, v]) => (
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
          <ScrollReveal><SectionHeading eyebrow="Application process" title="What happens, in order" /></ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={journey} /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow="Student life" title="What a month actually costs"
              lead="Real figures from students we placed this year. Budget about $350 to $550 a month in most cities." />
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
            <CardGrid min={240} gap="var(--space-6)">
              <ImagePlaceholder slot="study-housing" label="Dormitory or student housing" ratio="4 / 3" />
              <ImagePlaceholder slot="study-campus" label="Campus life, students outdoors" ratio="4 / 3" />
              <ImagePlaceholder slot="study-city" label="City street, everyday costs" ratio="4 / 3" />
            </CardGrid>
          </ScrollReveal>
        </div>

        <FaqLayout heading={
          <ScrollReveal><SectionHeading eyebrow="Questions" title="Student FAQs" lead="Anything else, message us on WhatsApp." /></ScrollReveal>
        }>
          <ScrollReveal delay={80}><Accordion items={generalFaq} /></ScrollReveal>
        </FaqLayout>

        <ScrollReveal>
          <CTABanner eyebrow="Next step" title="Apply for the 2026 intake"
            body="One short form. We reply with a shortlist, real tuition and the scholarships you qualify for."
            primaryLabel="Apply Now" primaryHref="#/apply" secondaryLabel="Book a Consultation" secondaryHref="#/contact" assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
