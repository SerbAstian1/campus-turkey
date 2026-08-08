const DSA = window.CampusTurkeyDesignSystem_4d33e7;
const { Button, Icon, Card, Input, Select, Checkbox, StepIndicator, SectionHeading, Badge, BrandDivider, Logo, ScrollReveal } = DSA;

const AA = "assets";
const STEPS = ["You", "Study plan", "Documents", "Done"];

function ApplyScreen({ onHome }) {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", country: "", level: "", field: "", city: "", intake: "", consent: true });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div style={{ background: "var(--surface-subtle)", paddingTop: 140, minHeight: "100dvh" }}>
      <div className="ct-container" style={{ maxWidth: 900, paddingBottom: "var(--section-y)", display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span className="ct-eyebrow">Student application</span>
          <h1 style={{ fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", color: "var(--text-heading)", margin: 0, maxWidth: "20ch" }}>Apply in four short steps</h1>
          <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0, maxWidth: 620 }}>
            Nothing to upload yet. Tell us who you are and what you want to study.
          </p>
        </ScrollReveal>

        <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
          <form onSubmit={(e) => { e.preventDefault(); setStep(step + 1); }} noValidate={false}>
          <StepIndicator steps={STEPS} current={step} style={{ marginBottom: "var(--space-10)" }} />

          {step === 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
              <Input id="a-name" label="Full name" icon="user" placeholder="Amina Yusuf" required value={form.name} onChange={set("name")} />
              <Input id="a-email" label="Email address" type="email" icon="mail" placeholder="you@example.com" required value={form.email} onChange={set("email")} />
              <Input id="a-phone" label="WhatsApp number" icon="phone" hint="Include your country code." value={form.phone} onChange={set("phone")} />
              <Select id="a-country" label="Country of residence" options={["Nigeria", "Morocco", "Kenya", "Egypt", "Pakistan", "Indonesia", "Other"]} value={form.country} onChange={set("country")} required />
            </div>
          ) : null}

          {step === 1 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
              <Select id="a-level" label="Study level" options={["Bachelor", "Master", "PhD", "Language course"]} value={form.level} onChange={set("level")} required />
              <Input id="a-field" label="Field of study" icon="book-open" placeholder="Medicine, engineering, business…" value={form.field} onChange={set("field")} />
              <Select id="a-city" label="Preferred city" options={["Any city", "Istanbul", "Ankara", "Izmir", "Antalya"]} value={form.city} onChange={set("city")} />
              <Select id="a-intake" label="Intake" options={["Autumn 2026", "Spring 2027", "Not sure yet"]} value={form.intake} onChange={set("intake")} />
              <div style={{ gridColumn: "span 2", display: "flex", gap: "var(--space-3)", padding: "var(--space-4)", borderRadius: "var(--radius-sm)", background: "var(--green-050)", border: "1px solid var(--green-100)" }}>
                <Icon name="info" size={18} color="var(--green-600)" />
                <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--green-800)" }}>
                  Public universities are highly subsidised. Private universities offer scholarships. We will show you both.
                </span>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              {["Passport copy", "High school or degree certificate", "Transcript of grades"].map((d) => (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-5)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--border-strong)", background: "var(--white)" }}>
                  <Icon name="upload" size={20} color="var(--green-500)" />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{d}</span>
                    <span style={{ display: "block", fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>PDF or photo. You can send these later on WhatsApp.</span>
                  </span>
                  <Button variant="secondary" size="sm">Choose file</Button>
                </div>
              ))}
              <Checkbox id="a-consent" label="Contact me on WhatsApp about my application"
                description="We reply within one working day. No marketing messages." checked={form.consent} onChange={set("consent")} />
            </div>
          ) : null}

          {step === 3 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
              <window.BrandMark size={80} />
              <Badge tone="brand" icon="check">Application received</Badge>
              <h3 style={{ fontSize: "var(--fs-h2)" }}>Thank you{form.name ? `, ${form.name.split(" ")[0]}` : ""}.</h3>
              <BrandDivider style={{ maxWidth: 220 }} />
              <p style={{ maxWidth: 460, color: "var(--text-body)" }}>
                We are matching you with universities now. You will get a shortlist with real tuition and deadlines within one working day.
              </p>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
                <Button variant="secondary" onClick={onHome}>Back to home</Button>
              </div>
            </div>
          ) : null}

          {step < 3 ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", marginTop: "var(--space-10)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)" }}>
              <Button variant="ghost" icon="arrow-left" type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
              <Button variant="primary" size="lg" type="submit">
                {step === 2 ? "Submit application" : "Continue"}
              </Button>
            </div>
          ) : null}
          </form>
        </Card>
      </div>
    </div>
  );
}

function PartnerLoginScreen({ onHome }) {
  const [tab, setTab] = React.useState("login");
  return (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "1.05fr 1fr" }}>
      <div style={{ background: "var(--gradient-brand-deep)", padding: "var(--section-y) var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--space-8)", justifyContent: "center" }}>
        <Logo variant="lockup" theme="reversed" height={96} assetBase={AA} />
        <h1 style={{ color: "var(--white)", fontSize: "var(--fs-h1)", lineHeight: "var(--lh-display)", maxWidth: 460, margin: 0 }}>Partner and representative portal</h1>
        <BrandDivider theme="dark" style={{ maxWidth: 280 }} />
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 420 }}>
          {["Track every student you refer", "See commission and payment status", "Download university brochures and price lists", "Register new applicants in one form"].map((t) => (
            <li key={t} style={{ display: "flex", gap: "var(--space-3)", color: "rgba(255,255,255,.88)", fontSize: "var(--fs-body)" }}>
              <Icon name="check" size={18} color="var(--green-300)" strokeWidth={2.5} />{t}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ background: "var(--surface-page)", padding: "var(--section-y) var(--gutter)", display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-pill)", background: "var(--surface-subtle)", border: "1px solid var(--border-subtle)" }}>
            {[["login", "Partner login"], ["register", "Register"]].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)} style={{
                flex: 1, height: 40, border: "none", borderRadius: "var(--radius-pill)", cursor: "pointer",
                fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)",
                background: tab === k ? "var(--white)" : "transparent",
                color: tab === k ? "var(--green-800)" : "var(--text-muted)",
                boxShadow: tab === k ? "var(--shadow-sm)" : "none",
              }}>{label}</button>
            ))}
          </div>

          {tab === "login" ? (
            <>
              <h3 style={{ fontSize: "var(--fs-h2)" }}>Welcome back</h3>
              <Input id="p-email" label="Email address" type="email" icon="mail" placeholder="agency@example.com" />
              <Input id="p-pass" label="Password" type="password" icon="lock" placeholder="••••••••" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
                <Checkbox id="p-remember" label="Keep me signed in" checked onChange={() => {}} />
                <a href="#/contact" style={{ fontSize: "var(--fs-body-sm)" }}>Forgot password</a>
              </div>
              <Button variant="primary" size="lg" fullWidth onClick={() => window.CT_GO("portal/dashboard")}>Sign in</Button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: "var(--fs-h2)" }}>Become a partner</h3>
              <Input id="r-org" label="Organisation name" icon="building-2" placeholder="Bright Futures Education" required />
              <Select id="r-kind" label="You are a" options={["Education agency", "Consultant", "University", "Country representative"]} required />
              <Input id="r-email" label="Work email" type="email" icon="mail" placeholder="you@agency.com" required />
              <Checkbox id="r-terms" label="I agree to the partner terms" checked onChange={() => {}} />
              <Button variant="primary" size="lg" fullWidth onClick={() => window.CT_GO("partners")}>Create partner account</Button>
            </>
          )}
          <Button variant="ghost" icon="arrow-left" onClick={onHome}>Back to the website</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ApplyScreen, PartnerLoginScreen });
