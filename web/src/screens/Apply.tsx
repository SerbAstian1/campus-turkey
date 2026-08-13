"use client";

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
import { useLeadSubmit } from "@/features/leads/submit";
import { useT } from "@/i18n/context";
import { useTranslatedOptions } from "@/i18n/options";
import { CaptchaField } from "@/features/leads/captcha";

const STEPS = ["You", "Study plan", "Documents", "Done"];

/**
 * The study levels the form offers, mapped onto the enum the API accepts.
 *
 * The screen's labels are the reader's; the schema's values are the database's. Sending
 * "Bachelor's degree" where `bachelor` is expected fails validation on a field the
 * applicant filled in correctly.
 */
const LEVEL_FOR: Record<string, "foundation" | "bachelor" | "master" | "phd" | undefined> = {
  "Foundation or language year": "foundation",
  "Bachelor's degree": "bachelor",
  "Master's degree": "master",
  "PhD": "phd",
};

/**
 * The four select lists, as canonical English.
 *
 * Hoisted to module scope because `useTranslatedOptions` memoises on the array
 * identity — a literal declared inside the component is a new array every render and
 * would rebuild the lookup on each keystroke.
 *
 * These are the values that reach the server and the staff inbox. Only the labels are
 * translated; see `useTranslatedOptions`.
 */
const COUNTRIES = ["Nigeria", "Morocco", "Kenya", "Egypt", "Pakistan", "Indonesia", "Other"] as const;
const CITIES = ["Any city", "Istanbul", "Ankara", "Izmir", "Antalya"] as const;
const INTAKES = ["Autumn 2026", "Spring 2027", "Not sure yet"] as const;

/**
 * Study levels, and the reason this list is written out rather than derived.
 *
 * It must stay identical to the keys of `LEVEL_FOR` above: that map turns the label into
 * the enum the API accepts, and a level absent from it submits `undefined`. Derived from
 * `Object.keys(LEVEL_FOR)` the order would follow insertion rather than the order the
 * form should offer, so it is stated — and the mismatch that produced is asserted
 * against in the component below.
 */
const LEVELS = [
  "Foundation or language year",
  "Bachelor's degree",
  "Master's degree",
  "PhD",
] as const;

export default function Apply() {
  const t = useT();
  const countries = useTranslatedOptions(COUNTRIES);
  const levels = useTranslatedOptions(LEVELS);
  const cities = useTranslatedOptions(CITIES);
  const intakes = useTranslatedOptions(INTAKES);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", country: "", level: "", field: "", city: "", intake: "", consent: true,
  });

  const { state, submit } = useLeadSubmit("STUDY");

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
          <span className="ct-eyebrow">{t("Student application")}</span>
          <h1 style={{ fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", color: "var(--text-heading)", margin: 0, maxWidth: "20ch" }}>{t("Apply in four short steps")}</h1>
          <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0, maxWidth: 620 }}>
            Nothing to upload yet. Tell us who you are and what you want to study.
          </p>
        </ScrollReveal>

        <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
          {/*
            Steps 0 and 1 only advance the wizard. Step 2 is the one that submits, and
            the wizard moves to "Done" only once the server confirms — advancing first
            and posting afterwards would show someone a completed application that was
            never received.
          */}
          <form
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();

              if (step < 2) {
                setStep(step + 1);
                return;
              }

              const ok = await submit(
                {
                  name: form.name,
                  email: form.email,
                  phone: form.phone,
                  country: form.country,
                  level: LEVEL_FOR[form.level] ?? undefined,
                  program: form.field,
                  intake: form.intake,
                  message: form.city ? `Preferred city: ${form.city}` : "",
                },
                form.consent,
              );

              if (ok) setStep(3);
            }}
          >
            <StepIndicator steps={STEPS} current={step} style={{ marginBottom: "var(--space-10)" }} />

            {step === 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                <Input id="a-name" label={t("Full name")} icon="user" placeholder={t("Amina Yusuf")} required value={form.name} onChange={set("name")} />
                <Input id="a-email" label={t("Email address")} type="email" icon="mail" placeholder="you@example.com" required value={form.email} onChange={set("email")} />
                <Input id="a-phone" label={t("WhatsApp number")} icon="phone" hint={t("Include your country code.")} value={form.phone} onChange={set("phone")} />
                {/*
                  Label translated, stored value English — the server and the staff
                  inbox are keyed by the English list. See `useTranslatedOptions`.
                */}
                <Select id="a-country" label={t("Country of residence")}
                  options={countries.options}
                  value={countries.display(form.country)}
                  onChange={(e) => setForm((f) => ({ ...f, country: countries.toEnglish(e.target.value) }))}
                  required />
              </div>
            ) : null}

            {step === 1 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                <Select id="a-level" label={t("Study level")}
                  options={levels.options}
                  value={levels.display(form.level)}
                  onChange={(e) => setForm((f) => ({ ...f, level: levels.toEnglish(e.target.value) }))}
                  required />
                <Input id="a-field" label={t("Field of study")} icon="book-open" placeholder={t("Medicine, engineering, business…")} value={form.field} onChange={set("field")} />
                <Select id="a-city" label={t("Preferred city")}
                  options={cities.options}
                  value={cities.display(form.city)}
                  onChange={(e) => setForm((f) => ({ ...f, city: cities.toEnglish(e.target.value) }))} />
                <Select id="a-intake" label={t("Intake")}
                  options={intakes.options}
                  value={intakes.display(form.intake)}
                  onChange={(e) => setForm((f) => ({ ...f, intake: intakes.toEnglish(e.target.value) }))} />
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
                    <Button variant="secondary" size="sm">{t("Choose file")}</Button>
                  </div>
                ))}
                <Checkbox id="a-consent" label={t("Contact me on WhatsApp about my application")}
                  description={t("We reply within one working day. No marketing messages.")} checked={form.consent} onChange={set("consent")} />
              </div>
            ) : null}

            {step === 3 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
                <BrandMark size={80} />
                <Badge tone="brand" icon="check">{t("Application received")}</Badge>
                <h3 style={{ fontSize: "var(--fs-h2)" }}>{form.name ? t("Thank you, {name}.", { name: form.name.split(" ")[0] ?? "" }) : t("Thank you.")}</h3>
                <BrandDivider style={{ maxWidth: 220 }} />
                <p style={{ maxWidth: 460, color: "var(--text-body)" }}>
                  We are matching you with universities now. You will get a shortlist with real tuition and deadlines within one working day.
                </p>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
                  <Button variant="secondary" onClick={() => go("home")}>{t("Back to home")}</Button>
                </div>
              </div>
            ) : null}

            {/* Placed above the buttons rather than beside them: on a phone the button
                row is at the bottom of a long form, and an error rendered inline with it
                scrolls out of view exactly when it is needed. */}
            {state.status === "failed" ? (
              <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginTop: "var(--space-6)", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                <Icon name="alert-circle" size={16} />{state.message}
              </span>
            ) : null}

            {/* Final step only. Solved on step 0 the token would very likely have
                expired by the time the visitor finished, and hCaptcha would refuse a
                submission the form had given every appearance of accepting. */}
            {step === 2 ? (
              <div style={{ marginTop: "var(--space-6)" }}>
                <CaptchaField />
              </div>
            ) : null}

            {step < 3 ? (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", marginTop: "var(--space-10)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)" }}>
                <Button variant="ghost" icon="arrow-left" type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>{t("Back")}</Button>
                <Button variant="primary" size="lg" type="submit" disabled={state.status === "sending"}>
                  {state.status === "sending" ? "Sending…" : step === 2 ? "Submit application" : "Continue"}
                </Button>
              </div>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  );
}
