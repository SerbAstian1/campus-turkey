const DSP = window.CampusTurkeyDesignSystem_4d33e7;
const { Button, Icon, Card, Badge, SectionHeading, Accordion, CTABanner, TimelineTrack, ScrollReveal, BrandDivider, Input, Select, Checkbox, StatBlock } = DSP;
const AP = "assets";
const goP = (r) => window.CT_GO(r);

function PartnerForm({ kinds, submitLabel = "Submit registration", intro }) {
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({ org: "", kind: "", country: "", name: "", email: "", phone: "", volume: "", terms: true });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
      {sent ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
          <window.BrandMark size={80} />
          <Badge tone="brand" icon="check">Registration received</Badge>
          <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Welcome{form.org ? `, ${form.org}` : ""}.</h3>
          <BrandDivider style={{ maxWidth: 220 }} />
          <p style={{ maxWidth: 460, color: "var(--text-body)" }}>Your agreement and portal login are on the way. Expect a call from your named contact within one working day.</p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="primary" icon="log-in" onClick={() => goP("portal")}>Go to the portal</Button>
            <Button variant="secondary" onClick={() => setSent(false)}>Register another office</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          {intro ? <p style={{ gridColumn: "span 2", margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>{intro}</p> : null}
          <Input id="p-org" label="Organisation name" icon="building-2" placeholder="Bright Futures Education" required value={form.org} onChange={set("org")} style={{ gridColumn: "span 2" }} />
          <Select id="p-kind" label="You are a" required options={kinds} value={form.kind} onChange={set("kind")} />
          <Input id="p-country" label="Country you cover" icon="globe" placeholder="Nigeria" required value={form.country} onChange={set("country")} />
          <Input id="p-name" label="Contact person" icon="user" placeholder="Full name" required value={form.name} onChange={set("name")} />
          <Input id="p-email" label="Work email" type="email" icon="mail" placeholder="you@agency.com" required value={form.email} onChange={set("email")} />
          <Input id="p-phone" label="WhatsApp number" icon="phone" hint="Include your country code." value={form.phone} onChange={set("phone")} />
          <Select id="p-volume" label="Students per year" options={["Under 10", "10 to 50", "50 to 200", "Over 200"]} value={form.volume} onChange={set("volume")} />
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Checkbox id="p-terms" label="I agree to the partner terms and commission schedule"
              description="You can read both before signing. Nothing is binding until you do." checked={form.terms} onChange={set("terms")} />
            <Button variant="primary" size="lg" type="submit">{submitLabel}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function PartnersScreen({ data }) {
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <window.PageHero eyebrow="Partnerships" title="Become a partner"
        lead="Agencies, consultants, universities and hospitals work with us on published commission rates, with a portal that shows every student's real stage."
        actions={<>
          <Button variant="onDark" size="lg" onClick={() => window.scrollToId("partner-form")}>Register now</Button>
          <Button variant="outlineOnDark" size="lg" icon="globe" onClick={() => goP("representative")}>{T("cta.rep")}</Button>
        </>} />

      <window.PageBody>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "var(--space-6)" }}>
          {data.partnerBenefits.map((b, i) => (
            <ScrollReveal key={b.title} delay={i * 70} style={{ display: "flex" }}><window.IconCard {...b} body={b.body} /></ScrollReveal>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="For institutions" title="Three ways institutions work with us"
            lead="Each one has its own page, its own terms and its own named contact." /></ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-6)" }}>
            {Object.keys(data.institutions).map((k, i) => {
              const inst = data.institutions[k];
              return (
                <ScrollReveal key={k} delay={i * 70} style={{ display: "flex" }}>
                  <Card interactive href={`#/institutions/${k}`} padding="var(--space-8)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <Icon name={inst.icon} size={22} color="var(--green-600)" />
                    <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{inst.title}</h3>
                    <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: 0 }}>{inst.lead}</p>
                    <span style={{ marginTop: "auto", paddingTop: "var(--space-3)", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-600)" }}>
                      Open page <Icon name="arrow-right" size={15} />
                    </span>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        <div id="partner-form" className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,380px) 1fr", gap: "var(--space-12)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <SectionHeading eyebrow="Registration" title="One form, one working day"
              lead="No fee to join. We reply with your agreement and portal access." />
            <BrandDivider />
            {[["Commission", "Published rates, paid in 30 days"], ["Territory", "Exclusive for representatives"], ["Support", "A named contact, not an inbox"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="ct-eyebrow">{k}</span>
                <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{v}</span>
              </div>
            ))}
          </div>
          <PartnerForm kinds={["Education agency", "Independent consultant", "University", "Hospital or clinic", "Chamber of commerce"]} />
        </div>

        <ScrollReveal><CTABanner eyebrow="Already a partner" title="Sign in to your portal"
          body="Track every referral, download materials and check your payments."
          primaryLabel="Partner Login" primaryHref="#/portal" secondaryLabel="Contact us" secondaryHref="#/contact" assetBase={AP} /></ScrollReveal>
      </window.PageBody>
    </div>
  );
}

function RepresentativeScreen({ data }) {
  const r = data.representative;
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <window.PageHero badge="Territories open in 9 countries" eyebrow="Country representatives" title="Become a Representative"
        lead="Hold an exclusive country or region for Campus Turkey. You recruit locally, we handle admissions, visas and everything inside Türkiye."
        actions={<>
          <Button variant="onDark" size="lg" onClick={() => window.scrollToId("rep-form")}>Apply for a territory</Button>
        </>} />

      <window.PageBody>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "var(--space-6)" }}>
          {r.benefits.map((b, i) => (
            <ScrollReveal key={b.title} delay={i * 70} style={{ display: "flex" }}><window.IconCard {...b} body={b.body} /></ScrollReveal>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal><SectionHeading eyebrow="How to join" title="Four steps to a territory" /></ScrollReveal>
          <ScrollReveal delay={80}><TimelineTrack steps={data.representativeSteps} /></ScrollReveal>
        </div>

        <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)", alignItems: "start" }}>
          <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow="Who we appoint" title="What we ask of you" />
            <Card padding="var(--space-8)" surface="tinted" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {r.requirements.map((q) => (
                <span key={q} style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--fs-body-sm)", color: "var(--green-800)" }}>
                  <Icon name="check" size={17} strokeWidth={2.5} color="var(--green-500)" />{q}
                </span>
              ))}
            </Card>
            <window.ImagePlaceholder slot="rep-office" label="Representative office or fair stand photography" ratio="4 / 3" />
          </ScrollReveal>
          <ScrollReveal delay={80} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow="Earnings" title="What you are paid" />
            <window.PriceTable columns={["Referral type", "Commission", "When it is paid"]} rows={r.earnings} />
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

        <div className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "minmax(280px,360px) 1fr", gap: "var(--space-16)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 140 }}>
            <ScrollReveal><SectionHeading eyebrow="Questions" title="Representative FAQs" /></ScrollReveal>
          </div>
          <ScrollReveal delay={80}><Accordion items={r.faq} /></ScrollReveal>
        </div>

        <ScrollReveal><CTABanner eyebrow="Next step" title="Check whether your country is open"
          body="One message tells you whether the territory is available and what the target would be."
          primaryLabel="Contact us" primaryHref="#/contact" secondaryLabel="Become a Partner" secondaryHref="#/partners" assetBase={AP} /></ScrollReveal>
      </window.PageBody>
    </div>
  );
}

function InstitutionScreen({ data, slug }) {
  /* Falling back to another institution's page silently served the wrong content for
     a year-old link. An unknown slug is a broken address and should say so. */
  const inst = data.institutions[slug];
  if (!inst) return <window.ErrorScreen state="notFound" />;
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <window.PageHero eyebrow={inst.eyebrow} title={inst.title} lead={inst.lead}
        actions={<>
          <Button variant="onDark" size="lg" onClick={() => goP("contact")}>{inst.cta}</Button>
          <Button variant="outlineOnDark" size="lg" icon="handshake" onClick={() => goP("partners")}>Partnership terms</Button>
        </>} />
      <window.PageBody>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "var(--space-10)" }}>
          {inst.stats.map((st, i) => (
            <ScrollReveal key={st.label} delay={i * 60}><StatBlock {...st} theme="light" /></ScrollReveal>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)" }}>
          {inst.points.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 70} style={{ display: "flex" }}><window.IconCard {...p} body={p.body} /></ScrollReveal>
          ))}
        </div>

        <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)", alignItems: "start" }}>
          <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SectionHeading eyebrow="Scope of work" title="What we deliver" />
            <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {inst.list.map((l) => (
                <span key={l} style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>
                  <Icon name="check" size={17} strokeWidth={2.5} color="var(--green-500)" />{l}
                </span>
              ))}
            </Card>
          </ScrollReveal>
          <ScrollReveal delay={80}><window.ImagePlaceholder slot={`inst-${inst.title}`} label={`${inst.title} photography, 4:3`} ratio="4 / 3" /></ScrollReveal>
        </div>

        <ScrollReveal><CTABanner eyebrow="Work with us" title={inst.cta}
          body="A 30 minute call is enough to see whether this fits. We come prepared with numbers."
          primaryLabel="Book a Consultation" primaryHref="#/contact" secondaryLabel="Become a Partner" secondaryHref="#/partners" assetBase={AP} /></ScrollReveal>
      </window.PageBody>
    </div>
  );
}

Object.assign(window, { PartnersScreen, RepresentativeScreen, InstitutionScreen, PartnerForm });
