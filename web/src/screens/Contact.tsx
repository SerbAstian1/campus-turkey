"use client";

/**
 * Contact and book a consultation. Ported from site/Company.jsx.
 *
 * No backend: submitting swaps to the confirmation panel unconditionally. Wire it to
 * your enquiries endpoint and handle the failure path before launch — a contact form
 * that silently drops messages is worse than none, because the visitor believes they
 * reached you.
 */

import { useState, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { contact } from "@/content";
import { BrandMark } from "@/components/Common";
import { go } from "@/app/router";
import { useLeadSubmit, type LeadType } from "@/features/leads/submit";
import { CaptchaField } from "@/features/leads/captcha";
import { useT } from "@/i18n/context";
import { ConsentPrivacyNote, FieldErrors, PageBody, PageHero } from "./shared";

/**
 * The topic someone picks decides which desk receives the enquiry.
 *
 * Every option used to arrive as `CONTACT`, so the four service desks could not filter
 * for their own work and read the whole inbox instead. The routing matters most for
 * "Medical treatment", and not cosmetically: medical enquiries carry health information,
 * and the server gives that type a 90-day retention window instead of two years
 * (`RETENTION_DAYS` in server/modules/leads/leads.service.ts). Handoff note 13.
 *
 * Partnership and Country representative deliberately stay `CONTACT`. Those types
 * require an organisation name — `approvePartnerApplication` creates the partner record
 * from it — and this form does not ask for one. Routing them here would post a payload
 * the server rejects, which presents as a broken contact form. Somebody who wants to
 * apply is sent to the registration form; somebody who wants to *ask* about it gets a
 * reply, which is what this form is for.
 */
const TOPIC_ROUTING: Record<string, LeadType> = {
  "Study in Türkiye": "STUDY",
  "Medical treatment": "MEDICAL",
  "Business facilitation": "BUSINESS",
  Employment: "EMPLOYMENT",
  "Tours and delegations": "TOURS",
};

/**
 * The dropdown, in the order it is offered — and the canonical English values.
 *
 * Partnership and Country representative route to `CONTACT` deliberately: both lead
 * types require an organisation name this form does not collect, so posting them
 * properly would be refused by the server. Somebody who wants to *apply* is sent to the
 * registration form; somebody who wants to *ask* gets a reply.
 */
export const TOPICS: readonly string[] = [
  "Study in Türkiye",
  "Medical treatment",
  "Business facilitation",
  "Employment",
  "Tours and delegations",
  "Partnership",
  "Country representative",
];

/**
 * Native controls keep the appointment form usable in the first HTML response.
 *
 * The rest of the public site progressively loads the legacy browser-only design
 * system. This page is the conversion path, so making its form wait for that bundle
 * turned a cosmetic dependency into a functional loading screen. These controls use
 * the same design tokens but have no runtime dependency on the bundle.
 */
function NativeInput({ label, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="ct-native-field" htmlFor={id}>
      <span>{label}{props.required ? " *" : ""}</span>
      <input id={id} {...props} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function NativeSelect({ label, options, id, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: readonly string[] }) {
  return (
    <label className="ct-native-field" htmlFor={id}>
      <span>{label}{props.required ? " *" : ""}</span>
      <select id={id} {...props}>
        <option value="" disabled>{label}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export default function Contact() {
  const t = useT();
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: "", date: "", when: "", message: "", consent: true });
  const [engaged, setEngaged] = useState(false);
  const kind = TOPIC_ROUTING[form.topic] ?? "CONTACT";
  const { state, submit } = useLeadSubmit(kind);
  const sent = state.status === "sent";

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({
        ...f,
        [k]: (e.target as HTMLInputElement).type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value,
      }));

  const details: [string, string][] = [
    ["map-pin", contact.address],
    ["phone", contact.phone],
    ["mail", contact.email],
  ];

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow={t("Contact")} title={t("Book a consultation")}
        lead={t("A 30 minute call with someone who knows your case. Free, and no obligation afterwards.")}
        actions={<button type="button" className="ct-native-button ct-native-button--outline" onClick={() => go("about")}>{t("See our offices")}</button>} />

      <PageBody>
        <div className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px,340px)", gap: "var(--space-12)", alignItems: "start" }}>
          <div className="ct-native-card ct-native-card--form">
            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
                <BrandMark size={80} />
                <span className="ct-native-badge">{t("Request received")}</span>
                {/* Interpolated rather than concatenated: a name's position in the
                    sentence is not the same in every language, and `{name}` lets the
                    translation put it where it belongs. */}
                <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>
                  {form.name
                    ? t("Thank you, {name}.", { name: form.name.split(" ")[0] ?? "" })
                    : t("Thank you.")}
                </h3>
                <span className="ct-native-divider" aria-hidden="true" />
                <p style={{ maxWidth: 440, color: "var(--text-body)" }}>{t("We will confirm your call slot on WhatsApp within one working day.")}</p>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                  <button type="button" className="ct-native-button ct-native-button--secondary" onClick={() => go("home")}>{t("Back to home")}</button>
                </div>
              </div>
            ) : (
              <form
                onFocusCapture={() => setEngaged(true)}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void submit(
                    {
                      name: form.name,
                      email: form.email,
                      phone: form.phone,
                      subject: form.topic,
                      // The call date and time preference are part of the enquiry, not a
                      // separate field the server models — they belong in the message a
                      // human reads.
                      message: [
                        form.message,
                        form.date && `Preferred date: ${form.date}`,
                        form.when && `Best time to call: ${form.when}`,
                      ]
                        .filter(Boolean)
                        .join("\n\n"),
                      ...(kind === "MEDICAL" ? { treatment: form.message } : {}),
                    },
                    form.consent,
                  );
                }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                <NativeInput id="c-name" label={t("Full name")} placeholder={t("Amina Yusuf")} autoComplete="name" required value={form.name} onChange={set("name")} />
                <NativeInput id="c-email" label={t("Email address")} type="email" placeholder="you@example.com" autoComplete="email" required value={form.email} onChange={set("email")} />
                <NativeInput id="c-phone" label={t("WhatsApp number")} type="tel" hint={t("Include your country code.")} autoComplete="tel" value={form.phone} onChange={set("phone")} />
                {/*
                  The label is translated; the stored value stays English, and the
                  round-trip below is what keeps those separate.

                  `TOPIC_ROUTING` is keyed by the English topic. Storing the translated
                  label instead would miss every key and fall through to `CONTACT` — so
                  a medical enquiry would reach the general desk and inherit a 730-day
                  retention window instead of 90. The design system's `Select` takes a
                  flat `string[]` and uses each option as both label and value, so the
                  separation has to happen here until it accepts `{value,label}` pairs.
                */}
                <NativeSelect id="c-topic" label={t("What is this about")} required
                  value={t(form.topic)}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const english = TOPICS.find((topic) => t(topic) === chosen) ?? "";
                    setForm((f) => ({ ...f, topic: english }));
                  }}
                  options={TOPICS.map((topic) => t(topic))} />
                <NativeInput id="c-date" label={t("Preferred date")} type="date" required
                  min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={set("date")} />
                <NativeSelect id="c-when" label={t("Best time to call")} required value={form.when} onChange={set("when")}
                  options={[
                    t("8am – 10am, UTC +3"),
                    t("10am – 12pm, UTC +3"),
                    t("1pm – 3pm, UTC +3"),
                    t("3pm – 6:30pm, UTC +3"),
                  ]} />
                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  <label htmlFor="c-msg" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{t("Anything we should know")}</label>
                  <textarea id="c-msg" className="ct-native-textarea" rows={4} value={form.message} onChange={set("message")} placeholder={t("Your grades, your treatment, your sector. Whatever is relevant.")} />
                  <label className="ct-native-checkbox" htmlFor="c-consent">
                    <input id="c-consent" type="checkbox" checked={form.consent} onChange={set("consent")} />
                    <span><strong>{t("Contact me on WhatsApp")}</strong><small>{t("We reply within one working day. No marketing messages.")}</small></span>
                  </label>
                  <ConsentPrivacyNote />

                  {/* The failure path. Without this the form can only ever appear to
                      succeed, which is the specific thing worse than having no form. */}
                  {state.status === "failed" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <span role="alert" style={{ fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>{state.message}</span>
                      <FieldErrors fields={state.fields} />
                    </div>
                  ) : null}

                  {/* Renders nothing without a site key, so development is unchanged. */}
                  <CaptchaField active={engaged} />

                  <button className="ct-native-button ct-native-button--primary" type="submit" disabled={state.status === "sending"}>
                    {state.status === "sending" ? t("Sending…") : t("Request my consultation")}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", position: "sticky", top: 140 }}>
            <div className="ct-native-card ct-native-card--tinted" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">{t("Head office")}</span>
              {details.map(([, v]) => (
                <div key={v} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="ct-native-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span className="ct-eyebrow">{t("Reply times")}</span>
              <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>{t("WhatsApp within 48 hours, every working day. Email within one working day.")}</p>
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
