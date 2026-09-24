"use client";

/**
 * The representative application form — brief §65.
 *
 * Visually the partner form's twin: same `Card`, same two-column grid, same field
 * rhythm, same confirmation composition. That is deliberate rather than lazy. Somebody
 * choosing between partnering and representing sees both pages in one session, and a
 * different-looking form would read as a different, lesser process.
 *
 * What differs is what the two relationships actually are. A partner is an organisation,
 * so that form leads with the organisation name and asks how many students they place.
 * A representative is a person (§12), so this leads with their name, makes the
 * organisation optional, and asks for the territory they cover, because territory is the
 * thing being agreed.
 *
 * It posts to `/api/representative-applications`, not to `/api/leads`. The confirmation
 * appears only after the server has stored it — the same rule the partner form follows,
 * for the same reason: a form that says "received" without receiving anything is worse
 * than no form, because the applicant stops waiting.
 */

import { useState, type FormEvent } from "react";
import { Badge, BrandDivider, Button, Card, Checkbox, Icon, Input, Select } from "@/ds";
import { BrandMark } from "@/components/Common";
import { go } from "@/app/router";
import { useRepresentativeApplication } from "@/features/representatives/submit";
import { useT } from "@/i18n/context";
import { useCountryOptions } from "@/i18n/countries";
import { ConsentPrivacyNote, FieldErrors } from "./shared";

const MIN_PASSWORD = 12;

export function RepresentativeForm() {
  const t = useT();
  const countries = useCountryOptions();
  const [form, setForm] = useState({
    fullName: "",
    organizationName: "",
    country: "",
    territory: "",
    email: "",
    phone: "",
    message: "",
    password: "",
    confirm: "",
    consent: true,
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { state, submit, reset } = useRepresentativeApplication();
  const sent = state.status === "sent";

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({
        ...f,
        [key]: (e.target as HTMLInputElement).type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value,
      }));

  return (
    <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
      {sent ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
          <BrandMark size={80} />
          <Badge tone="brand" icon="check">{t("Application received")}</Badge>
          <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>
            {form.fullName
              ? t("Thank you, {name}.", { name: form.fullName.split(" ")[0] ?? form.fullName })
              : t("Thank you.")}
          </h3>
          <BrandDivider style={{ maxWidth: 220 }} />
          {/* States plainly that no account exists yet. The partner form learned this
              the hard way: an applicant who reads "received" as "registered" tries to
              sign in, fails, and concludes the site is broken. */}
          <p style={{ maxWidth: 460, color: "var(--text-body)" }}>
            {t("Someone reviews every application by hand. Expect a call within one working day. The password you chose only becomes active after approval.")}
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="secondary" onClick={reset}>{t("Send another application")}</Button>
            <Button variant="ghost" onClick={() => go("home")}>{t("Back to the website")}</Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (form.password.length < MIN_PASSWORD) {
              setPasswordError(t("Use at least {count} characters.", { count: MIN_PASSWORD }));
              return;
            }
            if (form.password !== form.confirm) {
              setPasswordError(t("The two passwords do not match."));
              return;
            }
            setPasswordError(null);
            void submit(
              {
                fullName: form.fullName,
                organizationName: form.organizationName,
                country: form.country,
                territory: form.territory,
                email: form.email,
                phone: form.phone,
                message: form.message,
                password: form.password,
              },
              form.consent,
            );
          }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}
        >
          <Input id="r-name" label={t("Your full name")} icon="user" placeholder={t("Ngozi Eze")}
            required autoComplete="name" value={form.fullName} onChange={set("fullName")}
            style={{ gridColumn: "span 2" }} />

          <Select id="r-country" label={t("Country you are in")} required
            options={countries.options}
            value={countries.display(form.country)}
            onChange={(e) => setForm((f) => ({ ...f, country: countries.toEnglish(e.target.value) }))} />

          <Input id="r-territory" label={t("Territory you want to cover")}
            hint={t("A country, a region, or a set of cities.")}
            placeholder={t("South East Nigeria")} value={form.territory} onChange={set("territory")} />

          <Input id="r-email" label={t("Email address")} type="email" icon="mail"
            placeholder="you@example.com" required autoComplete="email"
            value={form.email} onChange={set("email")} />

          <Input id="r-phone" label={t("WhatsApp number")} icon="phone"
            hint={t("Include your country code.")} autoComplete="tel"
            value={form.phone} onChange={set("phone")} />

          <Input id="r-password" label={t("Create password")} type="password" icon="lock"
            hint={t("At least {count} characters. It becomes active after Campus Turkey approves your registration.", { count: MIN_PASSWORD })}
            required autoComplete="new-password"
            value={form.password} onChange={set("password")} />
          <Input id="r-confirm-password" label={t("Confirm password")} type="password" icon="lock"
            required autoComplete="new-password"
            value={form.confirm} onChange={set("confirm")} />

          {/* Optional, and labelled as such. A representative may be an individual with
              no company, and a required field here would push them to invent one. */}
          <Input id="r-org" label={t("Organisation (optional)")} icon="building"
            hint={t("If you already work through a company.")}
            placeholder={t("Eze Education Consultants")}
            value={form.organizationName} onChange={set("organizationName")}
            style={{ gridColumn: "span 2" }} />

          {/* A raw textarea styled to match `Input`, exactly as the contact form does.
              The design system has no multi-line field, and adding one here would be a
              second, slightly-different implementation of the same control. */}
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <label htmlFor="r-message" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>
              {t("Tell us about your experience")}
            </label>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
              {t("Where you have placed students, and how you reach them.")}
            </span>
            <textarea id="r-message" rows={4} value={form.message} onChange={set("message")}
              placeholder={t("I have worked with families in Enugu and Anambra since 2019.")}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--white)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)", resize: "vertical" }} />
          </div>

          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Checkbox id="r-consent" label={t("Campus Turkey may contact me about this application")}
              description={t("We use your details to review and respond. Nothing else.")}
              checked={form.consent} onChange={set("consent")} />
            <ConsentPrivacyNote />

            {state.status === "failed" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                  <Icon name="alert-circle" size={16} />{state.message}
                </span>
                <FieldErrors fields={state.fields} />
              </div>
            ) : null}
            {passwordError ? (
              <span role="alert" style={{ color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
                {passwordError}
              </span>
            ) : null}

            <Button variant="primary" size="lg" type="submit" disabled={state.status === "sending"}>
              {state.status === "sending" ? t("Sending…") : t("Submit application")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
