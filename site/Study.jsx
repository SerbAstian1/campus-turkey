const DSS = window.CampusTurkeyDesignSystem_4d33e7;
const { Button, Icon, Card, Badge, Tag, SectionHeading, Accordion, CTABanner, TimelineTrack, ScrollReveal, BrandDivider, StatBlock, TestimonialCard } = DSS;
const AS = "assets";
const goS = (r) => window.CT_GO(r);

function PageHero({ eyebrow, title, lead, actions, badge }) {
  return (
    <section style={{ position: "relative", background: "var(--gradient-brand-deep)", paddingTop: 150, paddingBottom: "calc(var(--section-y) + 40px)", marginBottom: "calc(var(--overlap) * -1)", overflow: "hidden" }}>
      <img src={`${AS}/map-of-turkey.jpg`} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "soft-light", opacity: .32, filter: "invert(1)" }} />
      <div className="ct-container" style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-5)", alignItems: "flex-start" }}>
        {badge ? <span style={{ alignSelf: "flex-start" }}><Badge tone="onDark" dot>{badge}</Badge></span> : null}
        <span className="ct-eyebrow" style={{ color: "var(--green-200)" }}>{eyebrow}</span>
        <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", maxWidth: "20ch", margin: 0 }}>{title}</h1>
        <p style={{ color: "rgba(255,255,255,.88)", fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", maxWidth: 620, margin: 0 }}>{lead}</p>
        {actions ? <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)", alignItems: "center" }}>{actions}</div> : null}
      </div>
    </section>
  );
}

function PageBody({ children, background = "var(--surface-subtle)" }) {
  return (
    <section style={{ position: "relative", zIndex: 10, background, borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>{children}</div>
    </section>
  );
}

function IconCard({ icon, title, body, tone = "plain" }) {
  return (
    <Card padding="var(--space-8)" surface={tone} interactive style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--green-050)" }}>
        <Icon name={icon} size={21} color="var(--green-600)" />
      </span>
      <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{title}</h3>
      <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0 }}>{body}</p>
    </Card>
  );
}

function PriceTable({ rows, columns }) {
  return (
    <Card padding="0" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr" }}>
        {columns.map((c) => (
          <span key={c} className="ct-eyebrow" style={{ padding: "var(--space-5) var(--space-6)", background: "var(--green-050)", color: "var(--green-700)" }}>{c}</span>
        ))}
        {rows.map((r, i) => r.map((cell, j) => (
          <span key={`${i}-${j}`} style={{
            padding: "var(--space-5) var(--space-6)", borderTop: "1px solid var(--border-subtle)",
            fontFamily: j === 0 ? "var(--font-ui)" : "var(--font-ui)",
            fontWeight: j === 0 ? "var(--fw-medium)" : "var(--fw-regular)",
            fontSize: "var(--fs-body-sm)", color: j === 0 ? "var(--green-800)" : "var(--text-body)",
          }}>{cell}</span>
        )))}
      </div>
    </Card>
  );
}

const WHY = [
  { icon: "wallet", title: "Cost you can plan for", body: "Public tuition from $600 a year and living costs from $350 a month. We give you the full number before you commit." },
  { icon: "globe", title: "Degrees recognised worldwide", body: "Turkish universities sit in global rankings and follow the European credit system, so your degree travels." },
  { icon: "languages", title: "Study in English", body: "Hundreds of programs are taught fully in English. Turkish-taught programs come with a preparatory language year." },
  { icon: "plane-landing", title: "Straightforward visas", body: "Student visas are issued on an acceptance letter. We prepare the file and book the appointment." },
  { icon: "map-pinned", title: "40 cities to choose from", body: "Istanbul, Ankara, Izmir, Antalya and beyond. Coastal, capital or campus town, whichever suits you." },
  { icon: "users", title: "300,000 international students", body: "You will not be the only one from your country. We introduce you before you fly." },
];

function StudyScreen({ data }) {
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero badge={T("hero.badge")} eyebrow="Our core service" title="Study in Türkiye"
        lead="Admission, scholarships, visa and arrival, handled by one team. You get real tuition figures and real deadlines before you decide anything."
        actions={<>
          <Button variant="onDark" size="lg" onClick={() => goS("apply")}>{T("cta.apply")}</Button>
          <Button variant="outlineOnDark" size="lg" icon="landmark" onClick={() => goS("universities")}>{T("cta.browse")}</Button>
        </>} />

      <PageBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Why Türkiye" title="Six reasons students choose it"
            lead="Quality education at a cost that works, in a country that already hosts hundreds of thousands of international students." /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "var(--space-6)" }}>
            {WHY.map((w, i) => (
              <ScrollReveal key={w.title} delay={i * 60} style={{ display: "flex" }}><IconCard {...w} /></ScrollReveal>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-end", justifyContent: "space-between" }}>
            <SectionHeading eyebrow="Scholarships" title="What you can actually get"
              lead="Four routes to a lower fee. We tell you which ones you qualify for before you spend anything." />
            <Button variant="secondary" icon="arrow-right" onClick={() => goS("apply")}>Check my eligibility</Button>
          </ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)" }}>
            {data.scholarships.map((s, i) => (
              <ScrollReveal key={s.name} delay={i * 60} style={{ display: "flex" }}>
                <Card padding="var(--space-8)" surface={i === 0 ? "tinted" : "plain"} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", alignItems: "flex-start" }}>
                    <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{s.name}</h3>
                    {i === 0 ? <Badge tone="brand" icon="award">Full ride</Badge> : null}
                  </div>
                  <p style={{ color: "var(--text-body)", margin: 0 }}>{s.who}</p>
                  <BrandDivider />
                  {[["Covers", s.covers], ["Timing", s.when], ["Your odds", s.competitive]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span className="ct-eyebrow">{k}</span>
                      <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{v}</span>
                    </div>
                  ))}
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Application process" title="What happens, in order" /></ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={data.journey} /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Student life" title="What a month actually costs"
            lead="Real figures from students we placed this year. Budget about $350 to $550 a month in most cities." /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "var(--space-6)" }}>
            {data.studentLife.map((s, i) => (
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
          </div>
          <ScrollReveal delay={80} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-6)" }}>
            {/*
              The three student-life photographs. Labels stay alongside `src`: dropping a
              picture reopens its reserved frame rather than leaving a broken image.

              Housing and city are 3:2 sources in a 4:3 frame, so `objectFit: cover` trims
              their top and bottom; `campus-life.jpg` is a true 4:3 and fills its frame
              uncropped. The ratio stays as agreed rather than bending to the files, because
              the fixed box is what stops the page moving when a picture is swapped.

              `study-campus` was labelled "students outdoors" while holding a lecture hall.
              The label is the placeholder's fallback text and never renders beside a
              picture, but it is the shoot instruction web/scripts/image-manifest.mjs
              prints — so it asked for something this frame already had. The label now
              describes the photograph.
            */}
            <window.ImagePlaceholder slot="study-housing" label="Dormitory or student housing" ratio="4 / 3"
              src={`${AS}/student housing.jpg`}
              alt="A Turkish apartment building with balconies, a Turkish flag hanging from one of them and an orange tree in the foreground" />
            <window.ImagePlaceholder slot="study-campus" label="Teaching, a full lecture hall" ratio="4 / 3"
              src={`${AS}/campus-life.jpg`}
              alt="Students seated in a tiered university lecture hall, facing a lecturer and a projected slide" />
            <window.ImagePlaceholder slot="study-city" label="City street, everyday costs" ratio="4 / 3"
              src={`${AS}/street-life.webp`}
              alt="A busy city street with döner kebab and street-food counters, vendors in aprons serving customers and pedestrians walking past" />
          </ScrollReveal>
        </div>

        <div className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) 1fr", gap: "var(--space-16)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 140 }}>
            <ScrollReveal><SectionHeading eyebrow="Questions" title="Student FAQs" lead="Anything else, message us on WhatsApp." /></ScrollReveal>
          </div>
          <ScrollReveal delay={80}><Accordion items={data.faq} /></ScrollReveal>
        </div>

        <ScrollReveal><CTABanner eyebrow="Next step" title="Apply for the 2026 intake"
          body="One short form. We reply with a shortlist, real tuition and the scholarships you qualify for."
          primaryLabel="Apply Now" primaryHref="#/apply" secondaryLabel="Book a Consultation" secondaryHref="#/contact" assetBase={AS} /></ScrollReveal>
      </PageBody>
    </div>
  );
}

function ServiceScreen({ data, slug }) {
  const s = data.serviceDetail[slug] || data.serviceDetail.medical;
  const others = Object.keys(data.serviceDetail).filter((k) => k !== slug);
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow={s.eyebrow} title={s.title} lead={s.lead}
        actions={<>
          <Button variant="onDark" size="lg" onClick={() => goS("contact")}>{s.cta}</Button>
        </>} />
      <PageBody>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "var(--space-10)" }}>
          {s.stats.map((st, i) => (
            <ScrollReveal key={st.label} delay={i * 60}><StatBlock {...st} theme="light" /></ScrollReveal>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)" }}>
          {s.points.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 70} style={{ display: "flex" }}><IconCard {...p} body={p.body} /></ScrollReveal>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="How it works" title={`${s.title} step by step`}
            lead="Five stages, and you always know which one you are in." /></ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={s.steps} /></ScrollReveal>
        </div>

        <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)", alignItems: "start" }}>
          <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow="Scope" title="What is included, and what is not" />
            {s.includes.map(([heading, items], gi) => (
              <Card key={heading} padding="var(--space-8)" surface={gi === 0 ? "tinted" : "plain"} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{heading}</h3>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {items.map((it) => (
                    <li key={it} style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>
                      <Icon name={gi === 0 ? "check" : "minus"} size={16} strokeWidth={2.5} color={gi === 0 ? "var(--green-500)" : "var(--neutral-400)"} />{it}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </ScrollReveal>
          <ScrollReveal delay={80} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow="Indicative prices" title="What people usually pay" />
            <PriceTable columns={["Service", "Typical price", "Time needed"]} rows={s.pricing} />
            <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
              Indicative ranges from files we handled in the last twelve months. Your written quote is always specific to you.
            </p>
            <window.ImagePlaceholder slot={`service-${s.title}`} label={`${s.title} photography, 4:3`} ratio="4 / 3" />
          </ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <ScrollReveal><SectionHeading eyebrow="Covered" title="What we arrange" /></ScrollReveal>
          <ScrollReveal delay={60} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
            {s.treatments.map((t) => <Tag key={t}>{t}</Tag>)}
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <Card surface="inverse" padding="var(--space-10)" radius="var(--radius-xl)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <span className="ct-eyebrow" style={{ color: "var(--green-300)" }}>Why people trust this desk</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "var(--space-5)" }}>
              {s.trust.map((t) => (
                <span key={t} style={{ display: "flex", gap: "var(--space-3)", color: "rgba(255,255,255,.9)", fontSize: "var(--fs-body-sm)" }}>
                  <Icon name="shield-check" size={18} color="var(--green-300)" />{t}
                </span>
              ))}
            </div>
          </Card>
        </ScrollReveal>

        <div className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) 1fr", gap: "var(--space-16)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 140 }}>
            <ScrollReveal><SectionHeading eyebrow="Questions" title={`${s.title} FAQs`} lead="Ask us anything else on WhatsApp." /></ScrollReveal>
          </div>
          <ScrollReveal delay={80}><Accordion items={s.faq} /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <ScrollReveal><SectionHeading eyebrow="Other services" title="What else we handle" /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-6)" }}>
            {others.map((k, i) => {
              const o = data.serviceDetail[k];
              return (
                <ScrollReveal key={k} delay={i * 60} style={{ display: "flex" }}>
                  <Card interactive href={`#/service/${k}`} padding="var(--space-8)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <Icon name={o.icon} size={22} color="var(--green-600)" />
                    <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{o.title}</h3>
                    <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: 0 }}>{o.lead}</p>
                    <span style={{ marginTop: "auto", paddingTop: "var(--space-3)", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-600)" }}>
                      Open page <Icon name="arrow-right" size={15} />
                    </span>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        <ScrollReveal><Card surface="tinted" padding="var(--space-10)" radius="var(--radius-xl)" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-8)", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ maxWidth: 520 }}>
            <span className="ct-eyebrow">Remember</span>
            <h3 style={{ fontSize: "var(--fs-h2)", margin: "var(--space-2) 0 var(--space-3)" }}>Education is our core service</h3>
            <p style={{ color: "var(--text-body)", margin: 0 }}>If a family member wants to study in Türkiye, we handle that too, on the same file.</p>
          </div>
          <Button variant="primary" size="lg" onClick={() => goS("study")}>See Study in Türkiye</Button>
        </Card></ScrollReveal>

        <ScrollReveal><CTABanner eyebrow="Talk to us" title={`Get a written plan for ${s.title.toLowerCase()}`}
          body="Tell us what you need. You get a clear scope and a price before you travel."
          primaryLabel="Book a Consultation" primaryHref="#/contact" secondaryLabel="Apply Now" secondaryHref="#/apply" assetBase={AS} /></ScrollReveal>
      </PageBody>
    </div>
  );
}

Object.assign(window, { StudyScreen, ServiceScreen, PageHero, PageBody, IconCard, PriceTable, WHY });
