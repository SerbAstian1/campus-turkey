/** About us. Ported from site/Company.jsx. */

import { Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal, StatBlock, TestimonialCard, TimelineTrack, ASSETS } from "@/ds";
import { accreditations, leadership, milestones, offices, stats, testimonials } from "@/content";
import { ImagePlaceholder } from "@/components/Common";
import { T } from "@/i18n/runtime";
import { go } from "@/app/router";
import { IconCard, PageBody, PageHero, splitStyle } from "./shared";
import { CardGrid } from "@/components/CardGrid";

const VALUES = [
  { icon: "eye", title: "Say the real number", body: "Tuition, living costs and our fee, in writing, before you commit to anything." },
  { icon: "route", title: "One team, whole journey", body: "Admission, visa, housing and arrival are one file with one contact, not four vendors." },
  { icon: "graduation-cap", title: "Education comes first", body: "Our other services exist because families asked for them. Study in Türkiye is what we are built around." },
];

export default function About() {
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow="About us" title="Your gateway to Türkiye"
        lead="Campus Turkey has worked with Turkish universities, hospitals and chambers of commerce since 2014. We help students, patients, businesses, workers and partners reach opportunities here."
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>{T("cta.apply")}</Button>
            <Button variant="outlineOnDark" size="lg" icon="calendar-check" onClick={() => go("contact")}>{T("cta.consult")}</Button>
          </>
        } />

      <PageBody>
        <ScrollReveal><ImagePlaceholder slot="about-hero" label="Team or office photography, 21:9 hero band" ratio="21 / 9" /></ScrollReveal>

        <CardGrid min={200} gap="var(--space-10)">
          {stats.map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 70}><StatBlock {...s} theme="light" /></ScrollReveal>
          ))}
        </CardGrid>

        <div className="ct-split" style={{ ...splitStyle, alignItems: "center" }}>
          <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <SectionHeading eyebrow="Why we exist" title="Most families lose money to guesswork" />
            <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0 }}>
              Before 2014 our founders watched students pay agents for a place that did not exist, or arrive in Istanbul with no dormitory and no residence appointment booked. Every part of this company was built to remove one of those failures.
            </p>
            <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0 }}>
              We publish real tuition. We confirm the fee with the university in writing before you pay. We meet you at the airport. When a program is wrong for you, we say so, even when it costs us the enrolment.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => go("study")}>See Study in Türkiye</Button>
              <Button variant="secondary" onClick={() => go("resources")}>Read our guides</Button>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}><ImagePlaceholder slot="about-founders" label="Founders or advising session, 4:3" ratio="4 / 3" /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="How we work" title="Three rules we do not bend" /></ScrollReveal>
          <CardGrid min={260} gap="var(--space-6)">
            {VALUES.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 70} style={{ display: "flex" }}><IconCard {...v} /></ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Our story" title="Twelve years, five desks" /></ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={milestones} /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow="Leadership" title="The people you will deal with"
              lead="You get a named contact on day one, and they stay with your file." />
          </ScrollReveal>
          <CardGrid min={220} gap="var(--space-6)">
            {leadership.map((p, i) => (
              <ScrollReveal key={p.name} delay={i * 60} style={{ display: "flex" }}>
                <Card padding="var(--space-6)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <ImagePlaceholder slot={`person-${p.name}`} label="Portrait, 1:1" ratio="1 / 1" icon="user" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{p.name}</h3>
                    <span className="ct-eyebrow">{p.role}</span>
                    <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: "var(--space-2) 0 0" }}>{p.note}</p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <ScrollReveal>
          <Card surface="inverse" padding="var(--space-10)" radius="var(--radius-xl)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <span className="ct-eyebrow" style={{ color: "var(--green-300)" }}>Credentials</span>
            <CardGrid min={240} gap="var(--space-5)">
              {accreditations.map((a) => (
                <span key={a} style={{ display: "flex", gap: "var(--space-3)", color: "rgba(255,255,255,.9)", fontSize: "var(--fs-body-sm)" }}>
                  <Icon name="badge-check" size={18} color="var(--green-300)" />{a}
                </span>
              ))}
            </CardGrid>
          </Card>
        </ScrollReveal>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="In their words" title="Students, patients and partners" /></ScrollReveal>
          <CardGrid min={280} gap="var(--space-6)">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 70} style={{ display: "flex" }}>
                <TestimonialCard {...t} style={{ width: "100%" }} />
              </ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Offices" title="Where you can find us" /></ScrollReveal>
          <CardGrid min={240} gap="var(--space-6)">
            {offices.map((o, i) => (
              <ScrollReveal key={o.city} delay={i * 70} style={{ display: "flex" }}>
                <Card padding="var(--space-6)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <ImagePlaceholder slot={`office-${o.city}`} label={`${o.city} office, 16:9`} ratio="16 / 9" icon="building-2" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <span className="ct-eyebrow">{o.role}</span>
                    <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{o.city}</h3>
                    <p style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", margin: 0 }}>{o.address}</p>
                    <p style={{ color: "var(--green-700)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", margin: 0 }}>{o.phone}</p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <ScrollReveal>
          <CTABanner eyebrow="Start here" title="Tell us what you need in Türkiye"
            body="Study, treatment, business or work. One message and a person replies."
            primaryLabel="Contact us" primaryHref="#/contact" secondaryLabel="Apply Now" secondaryHref="#/apply" assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
