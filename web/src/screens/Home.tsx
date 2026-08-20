"use client";

/** Homepage. Ported from site/Home.jsx. */

import { useEffect, useRef, useState } from "react";
import {
  Accordion, Badge, BrandDivider, Button, CTABanner, Card, Icon, SectionHeading, ScrollReveal,
  ServiceCard, StatBlock, StickyScrollSection, TestimonialCard, UniversityCard, ASSETS,
} from "@/ds";
import { generalFaq, journey, serviceCards, stats, testimonials, universities } from "@/content";
import { universityLogo } from "@/content/university-logos";
import { universityCardImage } from "@/content/university-photos";
import { BrandMark, ImagePlaceholder } from "@/components/Common";
import { go, useHref } from "@/app/router";
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

  /*
   * A looping background video is motion, and `base.css` already honours
   * `prefers-reduced-motion` for every animation on the site — an autoplaying reel that
   * ignores it would be the largest moving thing on the page and the only one that does.
   *
   * Resolved in an effect rather than during render because `matchMedia` does not exist
   * on the server: reading it during render would make the markup differ between the
   * server and the first client pass and produce a hydration mismatch. Starting at
   * `false` means the video mounts and is then swapped for its poster, which is the
   * right way round — the still is what a reduced-motion visitor should be left with.
   */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);

    // Followed rather than sampled once: the setting can be changed while the page is
    // open, and on macOS and Windows it commonly is.
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <section style={{ position: "relative", minHeight: "min(94vh,880px)", display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: 160, marginBottom: "calc(var(--overlap) * -1)", background: "var(--gradient-brand-deep)" }}>
      {/*
        The hero reel. No map behind it and no poster: the video is the background, and
        layering a still under something that covers it is a second download to hide.
        While it loads, and under reduced motion, `--gradient-brand-deep` from the
        section shows — the brand ground the hero was designed on, not an empty box.

        A poster would be reasonable later, but it has to be a frame from *this* reel;
        reaching for other artwork is what put the map here in the first place. Supply
        `assets/hero-poster.jpg` and it is a one-line change.

        `muted` is what makes `autoPlay` legal — every browser blocks an unmuted
        autoplay, so without it the video simply never starts. `playsInline` is the iOS
        half of the same rule; without it Safari goes fullscreen on play.

        Decorative: `aria-hidden`, no controls, out of the tab order. The heading carries
        the message for anyone who cannot see this.
      */}
      {!reduceMotion && (
        <video
          src={`${ASSETS}/hero-video.mp4`}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          /*
           * Darkened at the source rather than veiled by an overlay.
           *
           * This used to be `opacity: .55` under a green wash — two layers doing one
           * job, and the wash tinted the footage so every frame read as brand green
           * rather than as a place. `brightness` lowers the exposure and leaves the
           * colour alone, so the reel still looks like Türkiye.
           *
           * The value is set by contrast, not taste: the white display heading sits on
           * top of this, and at full exposure it fails against the bright frames. 0.45
           * holds it comfortably past AA across the reel.
           */
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45)" }}
        />
      )}
      {/*
        The green wash is gone at the client's request — the exposure above replaces it.
        This bottom gradient stays: it is not decoration but the thing that keeps the
        badge, heading and buttons legible where they actually sit, and removing it would
        put white text over whatever the reel happens to be showing at that moment.
      */}
      <span style={{ position: "absolute", inset: 0, background: "var(--gradient-protect-bottom)" }} />
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
  const href = useHref();
  const t = useT();
  const items = universities.slice(0, 14);
  return (
    <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", paddingTop: "var(--space-16)", paddingBottom: "var(--space-12)" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", textAlign: "center" }}>
        <span className="ct-eyebrow">{t("Affiliated universities")}</span>
        <h2 style={{ fontSize: "var(--fs-h3)", margin: 0, maxWidth: "30ch" }}>{t("We hold agreements with more than 200 universities across Türkiye")}</h2>
      </div>
      <div className="ct-marquee" style={{ position: "relative", marginTop: "var(--space-10)", overflow: "hidden", paddingInline: "var(--space-5)" }}>
        <div className="ct-marquee-track" style={{ display: "flex", alignItems: "center", gap: "var(--space-12)", width: "max-content" }}>
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy ? "true" : undefined}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-12)", flex: "none" }}>
              {items.map((u) => (
                <a key={`${copy}-${u.slug}`} href={href(`university/${u.slug}`)} tabIndex={copy ? -1 : 0} className="ct-affiliate"
                  style={{ flex: "none", display: "flex", alignItems: "center", gap: "var(--space-4)", textDecoration: "none", opacity: .75, transition: "opacity var(--dur-base) var(--ease-out)" }}>
                  {/*
                    `alt=""` on purpose. The link already carries the university's name
                    and city as text immediately to the right, so a described logo would
                    make a screen reader announce the same institution twice. The logo is
                    decoration here in the precise sense the attribute means.

                    Universities without a sourced logo pass no `src` and keep the
                    reserved frame, so the row stays even rather than gapped.
                  */}
                  <ImagePlaceholder slot={`logo-${u.slug}`} label="" round
                    src={universityLogo(u.slug)} alt=""
                    style={{ width: 44, height: 44, flex: "none", aspectRatio: "auto" }} />
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
          {/*
            The photograph, with the placeholder text kept as the fallback — the pattern
            `UniversityDetail` already uses, so removing `src` reopens the reserved frame
            rather than leaving a broken image.

            `alt` describes the picture rather than its role: this is content, and
            "Campus photography" tells a screen reader nothing the page has not said.
            Not `priority` — the section sits below the hero, and the hero heading is the
            LCP element here.

            The source is 16:9 in a 4:3 frame, so it is centre-cropped by `objectFit:
            cover`. The frame's ratio is deliberately not changed to suit one file: the
            box is a layout agreement, and the whole point of a fixed frame is that
            nothing shifts on the day a photograph is replaced.
          */}
          <ImagePlaceholder
            slot="home-about"
            label={t("Campus or student photography, 4:3")}
            ratio="4 / 3"
            src="/assets/homepage image 1.webp"
            alt={t("Six students working together around a table with a laptop and notebooks")}
          />
        </ScrollReveal>
        <ScrollReveal delay={80}><BrandDivider /></ScrollReveal>
        <ScrollReveal delay={160} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-12)", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", minWidth: 240 }}>
            <BrandMark size={92} />
            <span className="ct-tagline" style={{ fontSize: "var(--fs-caption)", color: "var(--green-600)", maxWidth: 150 }}>{t("Your guide to study in Turkey")}</span>
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
  const href = useHref();
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
                href={href(s.route)} index={i + 1} style={{ width: "100%" }}
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

/*
 * The reel itself: muted, looping, autostarted. What the frame reserved as an "animated
 * GIF" delivered as a video, which is what that label always meant — a GIF of the same
 * twelve seconds at this size would be many times the bytes and far worse looking.
 *
 * No green on it. The frame used to be a `--gradient-brand-deep` matte showing through a
 * `--space-3` pad, so brand green ran round every edge of the footage. `Hero` reached the
 * same conclusion when its green wash came off: the reel's job is to look like a real
 * place, and the green belongs in the UI around it, not on it.
 */
function CampusReel() {
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);

  /*
   * Resolved in an effect rather than during render, for the reason `Hero` gives:
   * `matchMedia` does not exist on the server, so reading it during render makes the
   * markup differ between the server and the first client pass. Starting at `false`
   * matches what the server rendered, and `controls` appears a frame later if needed.
   */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    // Followed rather than sampled once: the setting gets changed while a page is open.
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  /*
   * Playback is tied to visibility rather than to page load. This section sits a long way
   * down the homepage and the file is 4.6 MB, so autoplaying it on load spends that on
   * every visitor including the ones who never scroll this far. Pausing on the way back
   * out is the other half: a reel playing offscreen decodes frames nobody is looking at.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;

    const io = new IntersectionObserver(([entry]) => {
      // `noUncheckedIndexedAccess` is on, and an observer callback with an empty batch is
      // typeable even if it does not happen; nothing to decide from, so nothing to do.
      if (!entry) return;
      if (!entry.isIntersecting) { el.pause(); return; }
      /*
       * Muted again here, not only in the markup: React does not reliably reflect the
       * `muted` prop onto the element — it is a property, not an attribute, and the
       * server-rendered markup carries no `muted` at all — and every browser refuses an
       * unmuted autoplay. `play()` rejects when it is refused anyway, caught because an
       * unhandled rejection in the console is not a useful way to find that out.
       */
      el.muted = true;
      void el.play().catch(() => {});
    }, { rootMargin: "200px 0px", threshold: 0.2 });

    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  return (
    <div style={{ position: "relative", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <video
        ref={ref}
        data-slot="home-reel"
        /*
         * Absolute, not the relative `ASSETS` constant, for the reason the homepage
         * photograph is: relative resolves against the current directory, and every page
         * here is under a locale segment.
         */
        src="/assets/campus-reel.mp4"
        loop
        muted
        playsInline
        preload="metadata"
        /* Reduced motion gets the reel as something to start rather than something
           already running. It stays reachable — this is content the section promises,
           not decoration, so the answer there is controls, not removal. */
        controls={reduceMotion}
        /* Named with the line the section already uses for it, so the reel is not an
           unlabelled media element and no new string enters the phrase book to describe
           the same twelve seconds twice. */
        aria-label={t("Campus, city and student life in one short reel.")}
        style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }}
      />
    </div>
  );
}

function StoryReel() {
  const t = useT();
  return (
    <section style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <ScrollReveal>
          <SectionHeading eyebrow={t("A minute in Türkiye")} title={t("See what your year actually looks like")}
            lead={t("Campus, city and student life in one short reel.")} align="center" />
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <CampusReel />
        </ScrollReveal>
      </div>
    </section>
  );
}

function FeaturedUniversities() {
  const t = useT();
  const href = useHref();
  return (
    <section id="universities" style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
          {/*
            "More than 40", not "200+", because this heading is about the directory and a
            reader can count it — forty-four listings across twenty-eight cities. The
            larger number is not lost: the marquee above still says the agreements run to
            more than two hundred, which is a claim about the company rather than about
            what is browsable here. Stating both is stronger than stating one twice, and a
            number a visitor can disprove by scrolling costs more than it wins.
          */}
          <SectionHeading eyebrow={t("Featured universities")} title={t("More than 40 universities, one directory")}
            lead={t("Filter by city, type, language and scholarships. Every listing shows what it really costs.")} />
          <Button variant="secondary" icon="arrow-right" onClick={() => go("universities")}>{t("Browse the directory")}</Button>
        </ScrollReveal>
        <CardGrid min={260} gap="var(--space-6)">
          {universities.slice(0, 3).map((u, i) => (
            <ScrollReveal key={u.name} delay={i * 80} style={{ display: "flex" }}>
              <UniversityCard
                name={u.name} city={u.city} type={u.type} languages={u.languages} tuition={u.tuition}
                scholarship={u.scholarship} programs={u.programs}
                image={universityCardImage(u.slug)}
                href={href(`university/${u.slug}`)} style={{ width: "100%" }}
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
              lead={t("No jargon, no hidden stages. You always know what happens next.")} />
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
  const t = useT();
  return (
    <section style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal><SectionHeading eyebrow={t("In their words")} title={t("Students, patients and partners")} align="center" /></ScrollReveal>
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
              <span className="ct-eyebrow">{t("For agencies and institutions")}</span>
              <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Send us students, we handle the rest")}</h3>
              <p style={{ color: "var(--text-body)", margin: 0 }}>{t("Agencies, consultants, universities and country representatives get a portal, published commission rates and a named contact.")}</p>
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
              lead={t("Still unsure? Message us on WhatsApp and a person replies.")} />
          </ScrollReveal>
        </div>
        <ScrollReveal delay={80}><Accordion items={generalFaq} /></ScrollReveal>
      </div>
    </section>
  );
}

export default function Home() {
  const href = useHref();
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
          <CTABanner eyebrow={t("Ready when you are")} title={t("Start your application for the next intake")}
            body={t("Tell us what you want to study. We come back with real options, real costs and real deadlines.")}
            primaryLabel={t("Apply Now")} primaryHref={href("apply")} secondaryLabel={t("Book a Consultation")} secondaryHref={href("contact")} assetBase={ASSETS} />
        </ScrollReveal>
      </div>
    </div>
  );
}
