"use client";

/** Homepage. Ported from site/Home.jsx. */

import { useEffect, useRef, useState } from "react";
import {
  Accordion, Badge, BrandDivider, Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal,
  ServiceCard, StatBlock, StickyScrollSection, TestimonialCard, UniversityCard, ASSETS,
} from "@/ds";
import { generalFaq, journey, serviceCards, stats, testimonials, universities } from "@/content";
import { BrandMark, ImagePlaceholder } from "@/components/Common";
import { go } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";
import { useT } from "@/i18n/context";

/** Counts up when it scrolls into view. Reduced motion gets the final value at once. */
function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    const m = /^(\d+)(.*)$/.exec(String(value));
    if (!m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseInt(m[1]!, 10);
    const suffix = m[2]!;
    const el = ref.current;
    if (!el) return;

    let done = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting || done) return;
        done = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1100);
          const e = 1 - Math.pow(1 - p, 3);
          setText(Math.round(target * e) + suffix);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return <span ref={ref}>{text}</span>;
}

function Hero({ onApply, onExplore }: { onApply: () => void; onExplore: () => void }) {
  const t = useT();
  return (
    <section style={{ position: "relative", minHeight: "min(94vh,880px)", display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: 160, marginBottom: "calc(var(--overlap) * -1)", background: "var(--gradient-brand-deep)" }}>
      <img src={`${ASSETS}/map-of-turkey.jpg`} alt="" aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "soft-light", opacity: .5, filter: "invert(1)" }} />
      <span style={{ position: "absolute", inset: 0, background: "var(--surface-overlay-brand)" }} />
      <span style={{ position: "absolute", inset: 0, background: "var(--gradient-protect-bottom)" }} />
      <span data-slot="home-hero-video" style={{ position: "absolute", top: 108, left: "var(--gutter)", zIndex: 3, whiteSpace: "nowrap", padding: "4px 10px", borderRadius: "var(--radius-pill)", border: "1px dashed rgba(255,255,255,.4)", color: "rgba(255,255,255,.72)", fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase" }}>
        Background video placeholder
      </span>
      <div className="ct-container" style={{ position: "relative", zIndex: 2, marginTop: "auto", paddingBottom: "clamp(56px,8vw,110px)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <ScrollReveal style={{ display: "flex" }}><Badge tone="onDark" dot>{t("Applications open for the 2026 intake")}</Badge></ScrollReveal>
        <ScrollReveal delay={80}>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-1)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", maxWidth: "15ch", margin: 0 }}>
            {t("Study in Türkiye")}
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={160}>
          <p style={{ color: "rgba(255,255,255,.9)", fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", maxWidth: 560 }}>
            {t("Campus Turkey is your gateway to Türkiye. We help students, patients, businesses, workers and partners reach education, healthcare, business and employment opportunities here.")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={240} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-2)", alignItems: "center" }}>
          <Button variant="onDark" size="lg" onClick={onApply}>{t("Apply Now")}</Button>
          <Button variant="outlineOnDark" size="lg" icon="calendar-check" onClick={() => go("contact")}>{t("Book a Consultation")}</Button>
        </ScrollReveal>
        <button type="button" onClick={onExplore} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: "var(--space-4)", background: "transparent", border: "none", color: "rgba(255,255,255,.8)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", cursor: "pointer", width: "fit-content" }}>
          <Icon name="chevron-down" size={16} /> {t("See how it works")}
        </button>
      </div>
    </section>
  );
}

/* Affiliate wall. One continuous track, duplicated once so the -50% loop is seamless.
   Pauses on hover and holds still under reduced motion. Each plate is a wordmark
   stand-in until the real university logos arrive. */
function AffiliateMarquee() {
  const items = universities.slice(0, 14);
  return (
    <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", paddingTop: "var(--space-16)", paddingBottom: "var(--space-12)" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", textAlign: "center" }}>
        <span className="ct-eyebrow">Affiliated universities</span>
        <h2 style={{ fontSize: "var(--fs-h3)", margin: 0, maxWidth: "30ch" }}>We hold agreements with more than 200 universities across Türkiye</h2>
      </div>
      <div className="ct-marquee" style={{ position: "relative", marginTop: "var(--space-10)", overflow: "hidden", paddingInline: "var(--space-5)" }}>
        <div className="ct-marquee-track" style={{ display: "flex", alignItems: "center", gap: "var(--space-12)", width: "max-content" }}>
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy ? "true" : undefined}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-12)", flex: "none" }}>
              {items.map((u) => (
                <a key={`${copy}-${u.slug}`} href={`#/university/${u.slug}`} tabIndex={copy ? -1 : 0} className="ct-affiliate"
                  style={{ flex: "none", display: "flex", alignItems: "center", gap: "var(--space-4)", textDecoration: "none", opacity: .75, transition: "opacity var(--dur-base) var(--ease-out)" }}>
                  <ImagePlaceholder slot={`logo-${u.slug}`} label="" round style={{ width: 44, height: 44, flex: "none", aspectRatio: "auto" }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-body-sm)", lineHeight: 1.25, color: "var(--green-800)" }}>{u.name}</span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--neutral-500)" }}>{u.city}</span>
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
        <span aria-hidden="true" style={{ position: "absolute", inset: "0 auto 0 0", width: 96, background: "linear-gradient(to right, var(--surface-subtle), transparent)", pointerEvents: "none" }} />
        <span aria-hidden="true" style={{ position: "absolute", inset: "0 0 0 auto", width: 96, background: "linear-gradient(to left, var(--surface-subtle), transparent)", pointerEvents: "none" }} />
      </div>
    </section>
  );
}

function AboutSection() {
  const t = useT();
  return (
    <section id="about" style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal className="ct-split" style={{ display: "grid", gridTemplateColumns: "minmax(320px,1fr) minmax(280px,380px)", gap: "var(--space-12)", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", lineHeight: 1.25, color: "var(--text-heading)", margin: 0 }}>
              {t("Campus Turkey helps students, patients, businesses, workers and partners worldwide reach opportunities in Türkiye.")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
              <Button variant="primary" onClick={() => go("apply")}>{t("Apply Now")}</Button>
              <Button variant="secondary" onClick={() => go("partners")}>{t("Become a Partner")}</Button>
              <Button variant="ghost" icon="message-circle" onClick={() => go("contact")}>{t("Contact us")}</Button>
            </div>
          </div>
          <ImagePlaceholder slot="home-about" label="Campus or student photography, 4:3" ratio="4 / 3" />
        </ScrollReveal>
        <ScrollReveal delay={80}><BrandDivider /></ScrollReveal>
        <ScrollReveal delay={160} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-12)", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", minWidth: 240 }}>
            <BrandMark size={92} />
            <span className="ct-tagline" style={{ fontSize: "var(--fs-caption)", color: "var(--green-600)", maxWidth: 150 }}>Your guide to study in Turkey</span>
          </div>
          <p style={{ flex: 1, minWidth: 260, fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", maxWidth: 720 }}>
            Higher education is our core. We also support medical tourism, business visits and trade fairs, seasonal employment, educational tours, agency and university partnerships, and international representatives. Everything is designed to be clear, trustworthy and easy.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ServicesSection() {
  const t = useT();
  return (
    <section id="study" style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
        <ScrollReveal>
          <SectionHeading eyebrow={t("What we do")} title={t("Education first, and everything around it")} lead={t("Study in Türkiye is our main service. The rest are here when you need them.")} />
        </ScrollReveal>
        {/* Every card occupies one cell, including the featured one.
            It previously carried `gridColumn: span 2`, which is what made this section
            impossible to balance: six cards filling seven cells across three columns
            lay out as 2 + 3 + 1 no matter how the column count is chosen. The card
            keeps its emphasis — the badge, the accent treatment and the numbered index
            all come from `emphasis`, not from its width. */}
        <CardGrid min={280} gap="var(--space-6)">
          {serviceCards.map((s, i) => (
            <ScrollReveal key={s.title} delay={i * 80} style={{ display: "flex", minWidth: 0 }}>
              <ServiceCard
                icon={s.icon} title={s.title} description={s.description} points={s.points}
                badge={s.badge} emphasis={s.emphasis} ctaLabel={s.ctaLabel}
                href={`#/${s.route}`} index={i + 1} style={{ width: "100%" }}
              />
            </ScrollReveal>
          ))}
        </CardGrid>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section style={{ background: "var(--gradient-brand-deep)", padding: "var(--section-y) 0" }}>
      <CardGrid min={200} gap="var(--space-10)" className="ct-container">
        {stats.map((s, i) => (
          <ScrollReveal key={s.label} delay={i * 80}>
            <StatBlock label={s.label} description={s.description} value={<Counter value={s.value} />} />
          </ScrollReveal>
        ))}
      </CardGrid>
    </section>
  );
}

/* GIF stand-in, sized as a wide video band. Swap the placeholder for an <img src="...gif">
   once the reel is supplied; the frame geometry stays the same. */
function StoryReel() {
  return (
    <section style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <ScrollReveal>
          <SectionHeading eyebrow="A minute in Türkiye" title="See what your year actually looks like"
            lead="Campus, city and student life in one short reel." align="center" />
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <div style={{ position: "relative", borderRadius: "var(--radius-xl)", overflow: "hidden", background: "var(--gradient-brand-deep)", padding: "var(--space-3)" }}>
            <ImagePlaceholder slot="home-reel" label="Animated GIF reel, 16:9" ratio="16 / 9" icon="play"
              style={{ borderRadius: "var(--radius-lg)", background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.35)", color: "rgba(255,255,255,.82)" }} />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function FeaturedUniversities() {
  const t = useT();
  return (
    <section id="universities" style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
          <SectionHeading eyebrow={t("Featured universities")} title={t("200+ universities, one directory")}
            lead="Filter by city, type, language and scholarships. Every listing shows what it really costs." />
          <Button variant="secondary" icon="arrow-right" onClick={() => go("universities")}>{t("Browse the directory")}</Button>
        </ScrollReveal>
        <CardGrid min={260} gap="var(--space-6)">
          {universities.slice(0, 3).map((u, i) => (
            <ScrollReveal key={u.name} delay={i * 80} style={{ display: "flex" }}>
              <UniversityCard
                name={u.name} city={u.city} type={u.type} languages={u.languages} tuition={u.tuition}
                scholarship={u.scholarship} programs={u.programs}
                href={`#/university/${u.slug}`} style={{ width: "100%" }}
              />
            </ScrollReveal>
          ))}
        </CardGrid>
      </div>
    </section>
  );
}

function JourneySection() {
  const t = useT();
  return (
    <section style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container">
        <StickyScrollSection
          aside={
            <SectionHeading eyebrow={t("How it works")} title={t("Five steps from question to campus")}
              lead="No jargon, no hidden stages. You always know what happens next." />
          }
          items={journey.map((s) => ({
            content: (
              <div>
                <span className="ct-eyebrow" style={{ display: "block", marginBottom: 6 }}>{s.meta}</span>
                <h3 style={{ fontSize: "var(--fs-h3)", margin: "0 0 var(--space-2)" }}>{s.title}</h3>
                <p style={{ fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: "var(--text-body)", maxWidth: 560 }}>{s.description}</p>
              </div>
            ),
          }))}
        />
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal><SectionHeading eyebrow="In their words" title="Students, patients and partners" align="center" /></ScrollReveal>
        <CardGrid min={280} gap="var(--space-6)">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 80} style={{ display: "flex" }}>
              <TestimonialCard {...t} style={{ width: "100%" }} />
            </ScrollReveal>
          ))}
        </CardGrid>
      </div>
    </section>
  );
}

function PartnerStrip() {
  const t = useT();
  return (
    <section style={{ background: "var(--surface-subtle)", paddingBottom: "var(--section-y)" }}>
      <div className="ct-container">
        <ScrollReveal>
          <Card padding="var(--space-10)" radius="var(--radius-xl)" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-8)", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span className="ct-eyebrow">For agencies and institutions</span>
              <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Send us students, we handle the rest</h3>
              <p style={{ color: "var(--text-body)", margin: 0 }}>Agencies, consultants, universities and country representatives get a portal, published commission rates and a named contact.</p>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => go("partners")}>{t("Become a Partner")}</Button>
              <Button variant="secondary" icon="globe" onClick={() => go("representative")}>{t("Become a Representative")}</Button>
            </div>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}

function FaqSection() {
  const t = useT();
  return (
    <section className="ct-faq-grid" style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) 1fr", gap: "var(--space-16)", alignItems: "start" }}>
        <div style={{ position: "sticky", top: 132 }}>
          <ScrollReveal>
            <SectionHeading eyebrow={t("Questions")} title={t("Answers before you ask")}
              lead="Still unsure? Message us on WhatsApp and a person replies." />
          </ScrollReveal>
        </div>
        <ScrollReveal delay={80}><Accordion items={generalFaq} /></ScrollReveal>
      </div>
    </section>
  );
}

export default function Home() {
  const t = useT();
  return (
    <div>
      <Hero
        onApply={() => go("apply")}
        onExplore={() => {
          const el = document.getElementById("about");
          if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
        }}
      />
      <AffiliateMarquee />
      <AboutSection />
      <ServicesSection />
      <StatsBand />
      <StoryReel />
      <FeaturedUniversities />
      <JourneySection />
      <TestimonialsSection />
      <PartnerStrip />
      <FaqSection />
      <div className="ct-container" style={{ background: "var(--surface-page)", paddingBottom: "var(--section-y)" }}>
        <ScrollReveal>
          <CTABanner eyebrow="Ready when you are" title="Start your application for the next intake"
            body="Tell us what you want to study. We come back with real options, real costs and real deadlines."
            primaryLabel={t("Apply Now")} primaryHref="#/apply" secondaryLabel={t("Book a Consultation")} secondaryHref="#/contact" assetBase={ASSETS} />
        </ScrollReveal>
      </div>
    </div>
  );
}
