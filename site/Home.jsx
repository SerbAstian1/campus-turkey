const DS = window.CampusTurkeyDesignSystem_4d33e7;
const {
  Logo, BrandDivider, Button, Icon, Badge, Card, SectionHeading, ServiceCard,
  UniversityCard, StatBlock, TestimonialCard, Accordion, CTABanner,
  ScrollReveal, StickyScrollSection,
} = DS;

const A = "assets";
const go = (r) => window.CT_GO(r);

function Counter({ value }) {
  const ref = React.useRef(null);
  const [text, setText] = React.useState(value);
  React.useEffect(() => {
    const m = String(value).match(/^(\d+)(.*)$/);
    if (!m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseInt(m[1], 10), suffix = m[2];
    const el = ref.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting || done) return;
        done = true;
        const t0 = performance.now();
        const tick = (t) => {
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

function Hero({ onApply, onExplore }) {
  return (
    <section style={{ position: "relative", minHeight: "min(94vh,880px)", display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: 160, marginBottom: "calc(var(--overlap) * -1)", background: "var(--gradient-brand-deep)" }}>
      <img src={`${A}/map-of-turkey.jpg`} alt="" aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "soft-light", opacity: .5, filter: "invert(1)" }} />
      <span style={{ position: "absolute", inset: 0, background: "var(--surface-overlay-brand)" }} />
      <span style={{ position: "absolute", inset: 0, background: "var(--gradient-protect-bottom)" }} />
      <span style={{ position: "absolute", top: 108, left: "var(--gutter)", zIndex: 3, whiteSpace: "nowrap", padding: "4px 10px", borderRadius: "var(--radius-pill)", border: "1px dashed rgba(255,255,255,.4)", color: "rgba(255,255,255,.72)", fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase" }}>
        Background video placeholder
      </span>
      <div className="ct-container" style={{ position: "relative", zIndex: 2, marginTop: "auto", paddingBottom: "clamp(56px,8vw,110px)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <ScrollReveal style={{ display: "flex" }}><Badge tone="onDark" dot>{T("hero.badge")}</Badge></ScrollReveal>
        <ScrollReveal delay={80}>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-1)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", maxWidth: "15ch", margin: 0 }}>
            {T("hero.title")}
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={160}>
          <p style={{ color: "rgba(255,255,255,.9)", fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", maxWidth: 560 }}>
            {T("hero.lead")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={240} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-2)", alignItems: "center" }}>
          <Button variant="onDark" size="lg" onClick={onApply}>{T("cta.apply")}</Button>
          <Button variant="outlineOnDark" size="lg" icon="calendar-check" onClick={() => go("contact")}>{T("cta.consult")}</Button>
        </ScrollReveal>
        <button type="button" onClick={onExplore} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: "var(--space-4)", background: "transparent", border: "none", color: "rgba(255,255,255,.8)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", cursor: "pointer", width: "fit-content" }}>
          <Icon name="chevron-down" size={16} /> {T("hero.more")}
        </button>
      </div>
    </section>
  );
}

/* Affiliate wall. One continuous track, duplicated once so the -50% loop is
   seamless. Pauses on hover and holds still under reduced motion.
   Each plate is a wordmark stand-in until the real university logos arrive. */
function AffiliateMarquee({ universities }) {
  const items = universities.slice(0, 14);
  /* Two equal groups, each with the same inner gap as the gap between them,
     so translateX(-50%) lands exactly one period on and the loop has no seam. */
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
                <a key={`${copy}-${u.slug}`} href={`#/university/${u.slug}`}
                  tabIndex={copy ? -1 : 0} className="ct-affiliate"
                  style={{
                    flex: "none", display: "flex", alignItems: "center", gap: "var(--space-4)",
                    textDecoration: "none", opacity: .75,
                    transition: "opacity var(--dur-base) var(--ease-out)",
                  }}>
                  <window.ImagePlaceholder slot={`logo-${u.slug}`} label="" round
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
        <span aria-hidden="true" style={{ position: "absolute", inset: "0 auto 0 0", width: 96, background: "linear-gradient(to right, var(--surface-subtle), transparent)", pointerEvents: "none" }}></span>
        <span aria-hidden="true" style={{ position: "absolute", inset: "0 0 0 auto", width: 96, background: "linear-gradient(to left, var(--surface-subtle), transparent)", pointerEvents: "none" }}></span>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal style={{ display: "grid", gridTemplateColumns: "minmax(320px,1fr) minmax(280px,380px)", gap: "var(--space-12)", alignItems: "center" }} className="ct-split">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", lineHeight: 1.25, color: "var(--text-heading)", margin: 0 }}>
              {T("home.aboutLead")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
              <Button variant="primary" onClick={() => go("apply")}>{T("cta.apply")}</Button>
              <Button variant="secondary" onClick={() => go("partners")}>{T("cta.partner")}</Button>
              <Button variant="ghost" icon="message-circle" onClick={() => go("contact")}>{T("cta.contact")}</Button>
            </div>
          </div>
          {/*
            The label stays alongside `src`: dropping the photograph reopens the reserved
            frame rather than leaving a broken image. The source is 16:9 in a 4:3 frame, so
            `objectFit: cover` centre-crops it — the ratio is not bent to suit one file,
            because the fixed box is what stops the page moving when a picture is swapped.
            Path is relative, matching the rest of the prototype: routing is hash-based, so
            the document is always at the root and `assets/…` always resolves.
          */}
          <window.ImagePlaceholder slot="home-about" label="Campus or student photography, 4:3" ratio="4 / 3"
            src={`${A}/homepage image 1.webp`}
            alt="Six students working together around a table with a laptop and notebooks" />
        </ScrollReveal>
        <ScrollReveal delay={80}><BrandDivider /></ScrollReveal>
        <ScrollReveal delay={160} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-12)", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", minWidth: 240 }}>
            <window.BrandMark size={92} />
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

function ServicesSection({ services }) {
  return (
    <section id="study" style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
        <ScrollReveal>
          <SectionHeading eyebrow={T("home.servicesEyebrow")} title={T("home.servicesTitle")} lead={T("home.servicesLead")} />
        </ScrollReveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)", alignItems: "stretch" }}>
          {services.map((s, i) => (
            <ScrollReveal key={s.title} delay={i * 80}
              style={s.emphasis === "primary" ? { gridColumn: "span 2", minWidth: 0, display: "flex" } : { display: "flex" }}>
              <ServiceCard {...s} href={`#/${s.route}`} index={i + 1} style={{ width: "100%" }} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBand({ stats }) {
  return (
    <section style={{ background: "var(--gradient-brand-deep)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "var(--space-10)" }}>
        {stats.map((s, i) => (
          <ScrollReveal key={s.label} delay={i * 80}>
            <StatBlock {...s} value={<Counter value={s.value} />} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

/*
 * The reel itself: muted, looping, autostarted. What the frame reserved as an "animated
 * GIF" delivered as a video, which is what that label always meant — a GIF of the same
 * twelve seconds at this size would be many times the bytes and far worse looking.
 *
 * No green on it. The frame used to be a `--gradient-brand-deep` matte showing through a
 * `--space-3` pad, so brand green ran round every edge of the footage. The hero reached
 * the same conclusion when its green wash came off: the reel's job is to look like a real
 * place, and the green belongs in the UI around it, not on it.
 */
function CampusReel() {
  const ref = React.useRef(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    /* Followed rather than sampled once: the setting gets changed while a page is open,
       and on macOS and Windows it commonly is. */
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /*
   * Playback is tied to visibility rather than to page load. This section sits a long way
   * down the homepage and the file is 4.6 MB, so autoplaying it on load spends that on
   * every visitor including the ones who never scroll this far. Pausing on the way back
   * out is the other half: a reel playing offscreen decodes frames nobody is looking at.
   */
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) { el.pause(); return; }
      /* Muted again here, not only in the markup: React does not reliably reflect the
         `muted` prop onto the element, and every browser refuses an unmuted autoplay.
         `play()` returns a promise that rejects when it is refused anyway — caught,
         because an unhandled rejection in the console is not a useful way to find out. */
      el.muted = true;
      el.play().catch(() => {});
    }, { rootMargin: "200px 0px", threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  return (
    <div style={{ position: "relative", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <video ref={ref} data-slot="home-reel" src={`${A}/campus-reel.mp4`}
        loop muted playsInline preload="metadata"
        /* Reduced motion gets the reel as something to start rather than something
           already running. It stays reachable — this is content the section promises,
           not decoration, so the answer there is controls, not removal. */
        controls={reduceMotion}
        aria-label="Campus, city and student life in one short reel."
        style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
    </div>
  );
}

function StoryReel() {
  return (
    <section style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <ScrollReveal>
          <SectionHeading eyebrow="A minute in Türkiye" title="See what your year actually looks like"
            lead="Campus, city and student life in one short reel." align="center" />
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <CampusReel />
        </ScrollReveal>
      </div>
    </section>
  );
}

function FeaturedUniversities({ universities }) {
  return (
    <section id="universities" style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
          <SectionHeading eyebrow={T("home.uniEyebrow")} title={T("home.uniTitle")}
            lead="Filter by city, type, language and scholarships. Every listing shows what it really costs." />
          <Button variant="secondary" icon="arrow-right" onClick={() => go("universities")}>{T("cta.browse")}</Button>
        </ScrollReveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "var(--space-6)" }}>
          {universities.slice(0, 3).map((u, i) => (
            <ScrollReveal key={u.name} delay={i * 80} style={{ display: "flex" }}>
              <UniversityCard {...u} href={`#/university/${u.slug}`} style={{ width: "100%" }} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneySection({ journey }) {
  return (
    <section style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container">
        <StickyScrollSection
          aside={<SectionHeading eyebrow={T("home.journeyEyebrow")} title={T("home.journeyTitle")}
            lead="No jargon, no hidden stages. You always know what happens next." />}
          items={journey.map((s) => ({
            content: (
              <div>
                <span className="ct-eyebrow" style={{ display: "block", marginBottom: 6 }}>{s.meta}</span>
                <h3 style={{ fontSize: "var(--fs-h3)", margin: "0 0 var(--space-2)" }}>{s.title}</h3>
                <p style={{ fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: "var(--text-body)", maxWidth: 560 }}>{s.description}</p>
              </div>
            ),
          }))} />
      </div>
    </section>
  );
}

function TestimonialsSection({ testimonials }) {
  return (
    <section style={{ background: "var(--surface-subtle)", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <ScrollReveal><SectionHeading eyebrow="In their words" title="Students, patients and partners" align="center" /></ScrollReveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)" }}>
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 80} style={{ display: "flex" }}>
              <TestimonialCard {...t} style={{ width: "100%" }} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnerStrip() {
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
              <Button variant="primary" onClick={() => go("partners")}>{T("cta.partner")}</Button>
              <Button variant="secondary" icon="globe" onClick={() => go("representative")}>{T("cta.rep")}</Button>
            </div>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}

function FaqSection({ faq }) {
  return (
    <section className="ct-faq-grid" style={{ background: "var(--surface-page)", padding: "var(--section-y) 0" }}>
      <div className="ct-container ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) 1fr", gap: "var(--space-16)", alignItems: "start" }}>
        <div style={{ position: "sticky", top: 132 }}>
          <ScrollReveal>
            <SectionHeading eyebrow={T("home.faqEyebrow")} title={T("home.faqTitle")}
              lead="Still unsure? Message us on WhatsApp and a person replies." />
          </ScrollReveal>
        </div>
        <ScrollReveal delay={80}><Accordion items={faq} /></ScrollReveal>
      </div>
    </section>
  );
}

function HomeScreen({ data }) {
  return (
    <div>
      <Hero onApply={() => go("apply")} onExplore={() => {
        const el = document.getElementById("about");
        if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
      }} />
      <AffiliateMarquee universities={data.universities} />
      <AboutSection />
      <ServicesSection services={data.services} />
      <StatsBand stats={data.stats} />
      <StoryReel />
      <FeaturedUniversities universities={data.universities} />
      <JourneySection journey={data.journey} />
      <TestimonialsSection testimonials={data.testimonials} />
      <PartnerStrip />
      <FaqSection faq={data.faq} />
      <div className="ct-container" style={{ background: "var(--surface-page)", paddingBottom: "var(--section-y)" }}>
        <ScrollReveal>
          <CTABanner eyebrow="Ready when you are" title="Start your application for the next intake"
            body="Tell us what you want to study. We come back with real options, real costs and real deadlines."
            primaryLabel={T("cta.apply")} primaryHref="#/apply" secondaryLabel={T("cta.consult")} secondaryHref="#/contact" assetBase={A} />
        </ScrollReveal>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, Counter, FaqSection, AffiliateMarquee, StoryReel, go, A });
