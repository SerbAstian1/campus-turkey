"use client";

/**
 * Partner and representative registration. Ported from site/Pages.jsx.
 *
 * Posts to `/api/leads` through `useLeadSubmit`. The confirmation panel appears only
 * after the server has stored the lead — it used to appear unconditionally, which meant
 * a registration could be lost while the applicant was told it had arrived.
 */

import { useState, type FormEvent } from "react";
import { Badge, BrandDivider, Button, Card, Checkbox, Icon, Input, Select } from "@/ds";
import { BrandMark } from "@/components/Common";
import { PasswordInput } from "@/components/PasswordInput";
import { go } from "@/app/router";
import { useLeadSubmit } from "@/features/leads/submit";
import { CaptchaField } from "@/features/leads/captcha";
import { useT } from "@/i18n/context";
import { useTranslatedOptions } from "@/i18n/options";
import { useCountryOptions } from "@/i18n/countries";
import { FieldErrors } from "./shared";

/**
 * Canonical English, hoisted so `useTranslatedOptions` can memoise on array identity.
 * The stored value reaches the staff inbox and must not be translated.
 */
export const VOLUMES = ["Under 10", "10 to 50", "50 to 200", "Over 200"] as const;
const MIN_PASSWORD = 12;

export function PartnerForm({
  kinds, submitLabel, intro, leadKind = "PARTNER",
}: {
  kinds: readonly string[];
  /** Defaults to "Submit registration", translated — a default parameter cannot call `t()`. */
  submitLabel?: string;
  intro?: string;
  /**
   * Which kind of lead this is. The Representative page renders the same form with
   * different copy, and the two get different retention windows and land in different
   * queues — so the distinction has to survive the shared component.
   */
  leadKind?: "PARTNER" | "REPRESENTATIVE";
}) {
  const t = useT();
  const kindOptions = useTranslatedOptions(kinds);
  const volumes = useTranslatedOptions(VOLUMES);
  const countries = useCountryOptions();
  const [form, setForm] = useState({
    org: "", kind: "", country: "", name: "", email: "", phone: "", volume: "",
    password: "", confirm: "", terms: true,
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { state, submit, reset } = useLeadSubmit(leadKind);
  const sent = state.status === "sent";

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({
        ...f,
        [k]: (e.target as HTMLInputElement).type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value,
      }));

  return (
    <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
      {sent ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
          <BrandMark size={80} />
          <Badge tone="brand" icon="check">{t("Registration received")}</Badge>
          <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{form.org ? t("Welcome, {org}.", { org: form.org }) : t("Welcome.")}</h3>
          <BrandDivider style={{ maxWidth: 220 }} />
          <p style={{ maxWidth: 460, color: "var(--text-body)" }}>{t("Your registration is waiting for review. Expect a call within one working day; the password you chose becomes active only after approval.")}</p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="primary" icon="log-in" onClick={() => go("portal")}>{t("Go to the portal")}</Button>
            <Button variant="secondary" onClick={reset}>{t("Register another office")}</Button>
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
                org: form.org,
                name: form.name,
                email: form.email,
                phone: form.phone,
                territory: form.country,
                volume: form.volume,
                // "You are a" is a classification the reviewer needs; the schema has no
                // field for it, so it travels in the message a human reads.
                message: form.kind ? `Organisation type: ${form.kind}` : "",
              },
              form.terms,
              form.password,
            );
          }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          {intro ? <p style={{ gridColumn: "span 2", margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>{intro}</p> : null}
          <Input id="p-org" label={t("Organisation name")} icon="building" placeholder={t("Bright Futures Education")} required value={form.org} onChange={set("org")} style={{ gridColumn: "span 2" }} />
          <Select id="p-kind" label={t("You are a")} required options={kindOptions.options}
            value={kindOptions.display(form.kind)}
            onChange={(e) => setForm((f) => ({ ...f, kind: kindOptions.toEnglish(e.target.value) }))} />
          <Select id="p-country" label={t("Country you cover")} required
            options={countries.options}
            value={countries.display(form.country)}
            onChange={(e) => setForm((f) => ({ ...f, country: countries.toEnglish(e.target.value) }))} />
          <Input id="p-name" label={t("Contact person")} icon="user" placeholder={t("Full name")} required value={form.name} onChange={set("name")} />
          <Input id="p-email" label={t("Work email")} type="email" icon="mail" placeholder="you@agency.com" required value={form.email} onChange={set("email")} />
          <PasswordInput id="p-password" label={t("Create password")} icon="lock"
            hint={t("At least {count} characters. It becomes active after Campus Turkey approves your registration.", { count: MIN_PASSWORD })}
            required autoComplete="new-password"
            value={form.password} onChange={set("password")} />
          <PasswordInput id="p-confirm-password" label={t("Confirm password")} icon="lock"
            required autoComplete="new-password"
            value={form.confirm} onChange={set("confirm")} />
          <Input id="p-phone" label={t("WhatsApp number")} icon="phone" hint={t("Include your country code.")} value={form.phone} onChange={set("phone")} />
          <Select id="p-volume" label={t("Students per year")} options={volumes.options}
            value={volumes.display(form.volume)}
            onChange={(e) => setForm((f) => ({ ...f, volume: volumes.toEnglish(e.target.value) }))} />
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Checkbox id="p-terms" label={t("I agree to the partner terms and commission schedule")}
              description={t("You can read both before signing. Nothing is binding until you do.")} checked={form.terms} onChange={set("terms")} />
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

            {/* Covers both the Partner and Representative tracks — this form serves
                both, keyed by `leadKind`. */}
            <CaptchaField />

            <Button variant="primary" size="lg" type="submit" disabled={state.status === "sending"}>
              {state.status === "sending" ? t("Sending…") : (submitLabel ?? t("Submit registration"))}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
