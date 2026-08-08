/**
 * Student application. Ported from site/Apply.jsx.
 *
 * No backend: the wizard advances on submit. Wiring it means POSTing the form at the
 * final step and handling the failure case, which this screen currently cannot have.
 */

import { useState, type FormEvent } from "react";
import { Badge, BrandDivider, Button, Card, Checkbox, Icon, Input, Select, StepIndicator, ScrollReveal } from "@/ds";
import { BrandMark } from "@/components/Common";
import { go } from "@/app/router";

const STEPS = ["You", "Study plan", "Documents", "Done"];

export default function Apply() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", country: "", level: "", field: "", city: "", intake: "", consent: true,
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({
        ...f,
        [k]: (e.target as HTMLInputElement).type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value,
      }));

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
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); setStep(step + 1); }}>
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
                <BrandMark size={80} />
                <Badge tone="brand" icon="check">Application received</Badge>
                <h3 style={{ fontSize: "var(--fs-h2)" }}>Thank you{form.name ? `, ${form.name.split(" ")[0]}` : ""}.</h3>
                <BrandDivider style={{ maxWidth: 220 }} />
                <p style={{ maxWidth: 460, color: "var(--text-body)" }}>
                  We are matching you with universities now. You will get a shortlist with real tuition and deadlines within one working day.
                </p>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
                  <Button variant="secondary" onClick={() => go("home")}>Back to home</Button>
                </div>
              </div>
            ) : null}

            {step < 3 ? (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", marginTop: "var(--space-10)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)" }}>
                <Button variant="ghost" icon="arrow-left" type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
                <Button variant="primary" size="lg" type="submit">{step === 2 ? "Submit application" : "Continue"}</Button>
              </div>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  );
}
