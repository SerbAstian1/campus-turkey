const DSY = window.CampusTurkeyDesignSystem_4d33e7;
const { Button, Icon, Card, Badge, SectionHeading, CTABanner, TimelineTrack, ScrollReveal, BrandDivider, Input, Select, Checkbox, StatBlock, TestimonialCard } = DSY;
const AY = "assets";
const goY = (r) => window.CT_GO(r);

const VALUES = [
  { icon: "eye", title: "Say the real number", body: "Tuition, living costs and our fee, in writing, before you commit to anything." },
  { icon: "route", title: "One team, whole journey", body: "Admission, visa, housing and arrival are one file with one contact, not four vendors." },
  { icon: "graduation-cap", title: "Education comes first", body: "Our other services exist because families asked for them. Study in Türkiye is what we are built around." },
];

function AboutScreen({ data }) {
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <window.PageHero eyebrow="About us" title="Your gateway to Türkiye"
        lead="Campus Turkey has worked with Turkish universities, hospitals and chambers of commerce since 2014. We help students, patients, businesses, workers and partners reach opportunities here."
        actions={<>
          <Button variant="onDark" size="lg" onClick={() => goY("apply")}>{T("cta.apply")}</Button>
          <Button variant="outlineOnDark" size="lg" icon="calendar-check" onClick={() => goY("contact")}>{T("cta.consult")}</Button>
        </>} />
      <window.PageBody>
        <ScrollReveal><window.ImagePlaceholder slot="about-hero" label="Team or office photography, 21:9 hero band" ratio="21 / 9" /></ScrollReveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "var(--space-10)" }}>
          {data.stats.map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 70}><StatBlock {...s} theme="light" /></ScrollReveal>
          ))}
        </div>

        <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)", alignItems: "center" }}>
          <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <SectionHeading eyebrow="Why we exist" title="Most families lose money to guesswork" />
            <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0 }}>
              Before 2014 our founders watched students pay agents for a place that did not exist, or arrive in Istanbul with no dormitory and no residence appointment booked. Every part of this company was built to remove one of those failures.
            </p>
            <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0 }}>
              We publish real tuition. We confirm the fee with the university in writing before you pay. We meet you at the airport. When a program is wrong for you, we say so, even when it costs us the enrolment.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => goY("study")}>See Study in Türkiye</Button>
              <Button variant="secondary" onClick={() => goY("resources")}>Read our guides</Button>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}><window.ImagePlaceholder slot="about-founders" label="Founders or advising session, 4:3" ratio="4 / 3" /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="How we work" title="Three rules we do not bend" /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "var(--space-6)" }}>
            {VALUES.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 70} style={{ display: "flex" }}><window.IconCard {...v} body={v.body} /></ScrollReveal>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Our story" title="Twelve years, five desks" /></ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={data.milestones} /></ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Leadership" title="The people you will deal with"
            lead="You get a named contact on day one, and they stay with your file." /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "var(--space-6)" }}>
            {data.leadership.map((p, i) => (
              <ScrollReveal key={p.name} delay={i * 60} style={{ display: "flex" }}>
                <Card padding="var(--space-6)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <window.ImagePlaceholder slot={`person-${p.name}`} label="Portrait, 1:1" ratio="1 / 1" icon="user" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{p.name}</h3>
                    <span className="ct-eyebrow">{p.role}</span>
                    <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: "var(--space-2) 0 0" }}>{p.note}</p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal>
          <Card surface="inverse" padding="var(--space-10)" radius="var(--radius-xl)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <span className="ct-eyebrow" style={{ color: "var(--green-300)" }}>Credentials</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-5)" }}>
              {data.accreditations.map((a) => (
                <span key={a} style={{ display: "flex", gap: "var(--space-3)", color: "rgba(255,255,255,.9)", fontSize: "var(--fs-body-sm)" }}>
                  <Icon name="badge-check" size={18} color="var(--green-300)" />{a}
                </span>
              ))}
            </div>
          </Card>
        </ScrollReveal>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="In their words" title="Students, patients and partners" /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)" }}>
            {data.testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 70} style={{ display: "flex" }}><TestimonialCard {...t} style={{ width: "100%" }} /></ScrollReveal>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="Offices" title="Where you can find us" /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-6)" }}>
            {data.offices.map((o, i) => (
              <ScrollReveal key={o.city} delay={i * 70} style={{ display: "flex" }}>
                <Card padding="var(--space-6)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <window.ImagePlaceholder slot={`office-${o.city}`} label={`${o.city} office, 16:9`} ratio="16 / 9" icon="building-2" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <span className="ct-eyebrow">{o.role}</span>
                    <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{o.city}</h3>
                    <p style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", margin: 0 }}>{o.address}</p>
                    <p style={{ color: "var(--green-700)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", margin: 0 }}>{o.phone}</p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal><CTABanner eyebrow="Start here" title="Tell us what you need in Türkiye"
          body="Study, treatment, business or work. One message and a person replies."
          primaryLabel="Contact us" primaryHref="#/contact" secondaryLabel="Apply Now" secondaryHref="#/apply" assetBase={AY} /></ScrollReveal>
      </window.PageBody>
    </div>
  );
}

function ContactScreen({ data }) {
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", topic: "", when: "", message: "", consent: true });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <window.PageHero eyebrow="Contact" title="Book a consultation"
        lead="A 30 minute call with someone who knows your case. Free, and no obligation afterwards."
        actions={<Button variant="outlineOnDark" size="lg" icon="building-2" onClick={() => goY("about")}>See our offices</Button>} />
      <window.PageBody>
        <div className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px,340px)", gap: "var(--space-12)", alignItems: "start" }}>
          <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
                <window.BrandMark size={80} />
                <Badge tone="brand" icon="check">Request received</Badge>
                <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Thank you{form.name ? `, ${form.name.split(" ")[0]}` : ""}.</h3>
                <BrandDivider style={{ maxWidth: 220 }} />
                <p style={{ maxWidth: 440, color: "var(--text-body)" }}>We will confirm your call slot on WhatsApp within one working day.</p>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                  <Button variant="secondary" onClick={() => goY("home")}>Back to home</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                <Input id="c-name" label="Full name" icon="user" placeholder="Amina Yusuf" required value={form.name} onChange={set("name")} />
                <Input id="c-email" label="Email address" type="email" icon="mail" placeholder="you@example.com" required value={form.email} onChange={set("email")} />
                <Input id="c-phone" label="WhatsApp number" icon="phone" hint="Include your country code." value={form.phone} onChange={set("phone")} />
                <Select id="c-topic" label="What is this about" required value={form.topic} onChange={set("topic")}
                  options={["Study in Türkiye", "Medical treatment", "Business facilitation", "Employment", "Tours and delegations", "Partnership", "Country representative"]} />
                <Select id="c-when" label="Best time to call" value={form.when} onChange={set("when")}
                  options={["Morning, Türkiye time", "Afternoon, Türkiye time", "Evening, Türkiye time"]} style={{ gridColumn: "span 2" }} />
                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  <label htmlFor="c-msg" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>Anything we should know</label>
                  <textarea id="c-msg" rows={4} value={form.message} onChange={set("message")} placeholder="Your grades, your treatment, your sector. Whatever is relevant."
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--white)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)", resize: "vertical" }} />
                  <Checkbox id="c-consent" label="Contact me on WhatsApp" description="We reply within one working day. No marketing messages." checked={form.consent} onChange={set("consent")} />
                  <Button variant="primary" size="lg" type="submit">Request my consultation</Button>
                </div>
              </form>
            )}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", position: "sticky", top: 140 }}>
            <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">Head office</span>
              {[["map-pin", data.contact.address], ["phone", data.contact.phone], ["mail", data.contact.email]].map(([ic, v]) => (
                <div key={v} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                  <Icon name={ic} size={17} color="var(--green-600)" />
                  <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span className="ct-eyebrow">Reply times</span>
              <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>WhatsApp within 48 hours, every working day. Email within one working day.</p>
            </Card>
          </div>
        </div>
      </window.PageBody>
    </div>
  );
}

function ResourcesScreen({ data }) {
  const [tag, setTag] = React.useState(null);
  const tags = [...new Set(data.resources.map((r) => r.tag))];
  const list = data.resources.filter((r) => !tag || r.tag === tag);
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <window.PageHero eyebrow="Resources" title="Guides, checklists and costs"
        lead="Everything we send students, written down. Read before you apply, or ask us to walk you through it." />
      <window.PageBody>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <span className="ct-eyebrow" style={{ marginInlineEnd: "var(--space-2)" }}>Filter</span>
          {tags.map((t) => (
            <DSY.Tag key={t} selected={tag === t} onClick={() => setTag(tag === t ? null : t)}
              count={data.resources.filter((r) => r.tag === t).length}>{t}</DSY.Tag>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)" }}>
          {list.map((r, i) => (
            <ScrollReveal key={r.slug} delay={i * 60} style={{ display: "flex" }}>
              <Card interactive href={`#/blog/${r.slug}`} padding="var(--space-6)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <window.ImagePlaceholder slot={`article-${r.slug}`} label="Article image, 16:9" ratio="16 / 9" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
                  <Badge tone="neutral">{r.tag}</Badge>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{r.read} read</span>
                </div>
                <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{r.title}</h3>
                <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0, flex: 1 }}>{r.body}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-600)" }}>
                  Read the guide <Icon name="arrow-right" size={15} />
                </span>
              </Card>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal><CTABanner eyebrow="Faster than reading" title="Ask us your question directly"
          body="A person replies on WhatsApp, usually the same day."
          primaryLabel="Book a Consultation" primaryHref="#/contact" secondaryLabel="Apply Now" secondaryHref="#/apply" assetBase={AY} /></ScrollReveal>
      </window.PageBody>
    </div>
  );
}

function BlogPostScreen({ data, slug }) {
  const post = data.resources.find((r) => r.slug === slug) || data.resources[0];
  const more = data.resources.filter((r) => r.slug !== post.slug).slice(0, 3);
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <section style={{ background: "var(--gradient-brand-deep)", paddingTop: 150, paddingBottom: "calc(var(--section-y) + 40px)", marginBottom: "calc(var(--overlap) * -1)" }}>
        <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 820 }}>
          <button type="button" onClick={() => goY("resources")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,.78)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", cursor: "pointer", width: "fit-content", padding: 0 }}>
            <Icon name="arrow-left" size={16} /> All resources
          </button>
          <span style={{ alignSelf: "flex-start" }}><Badge tone="onDark">{post.tag}</Badge></span>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-h1)", lineHeight: "var(--lh-display)", margin: 0 }}>{post.title}</h1>
          <p style={{ color: "rgba(255,255,255,.86)", fontSize: "var(--fs-lead)", margin: 0 }}>{post.body}</p>
          <span style={{ color: "rgba(255,255,255,.7)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)" }}>
            {post.date} · {post.read} read · {post.author}
          </span>
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
        <div className="ct-container ct-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px,320px)", gap: "var(--space-12)", alignItems: "start" }}>
          <article style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", maxWidth: 720 }}>
            <window.ImagePlaceholder slot={`post-${post.slug}`} label="Article lead image, 16:9" ratio="16 / 9" />
            {post.sections.map(([heading, body], i) => (
              <ScrollReveal key={heading} delay={i * 40} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{heading}</h2>
                <p style={{ fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0, textWrap: "pretty" }}>{body}</p>
              </ScrollReveal>
            ))}
            <BrandDivider />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
              <Button variant="primary" onClick={() => goY("apply")}>{T("cta.apply")}</Button>
              <Button variant="secondary" onClick={() => goY("contact")}>{T("cta.consult")}</Button>
            </div>
          </article>

          <aside style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span className="ct-eyebrow">In this article</span>
              {post.sections.map(([h]) => (
                <span key={h} style={{ display: "flex", gap: "var(--space-2)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>
                  <Icon name="chevron-right" size={15} color="var(--green-500)" />{h}
                </span>
              ))}
            </Card>
            <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">More resources</span>
              {more.map((m) => (
                <a key={m.slug} href={`#/blog/${m.slug}`} style={{ display: "flex", flexDirection: "column", gap: 2, textDecoration: "none" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{m.title}</span>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.tag} · {m.read}</span>
                </a>
              ))}
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { AboutScreen, ContactScreen, ResourcesScreen, BlogPostScreen, VALUES });
