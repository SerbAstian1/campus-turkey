"use client";

/**
 * Contact and book a consultation. Ported from site/Company.jsx.
 *
 * No backend: submitting swaps to the confirmation panel unconditionally. Wire it to
 * your enquiries endpoint and handle the failure path before launch — a contact form
 * that silently drops messages is worse than none, because the visitor believes they
 * reached you.
 */

import { useState, type FormEvent } from "react";
import { Badge, BrandDivider, Button, Card, Checkbox, Icon, Input, Select } from "@/ds";
import { contact } from "@/content";
import { BrandMark } from "@/components/Common";
import { go } from "@/app/router";
import { useLeadSubmit } from "@/features/leads/submit";
import { PageBody, PageHero } from "./shared";

export default function Contact() {
  /**
   * "Medical treatment" is routed as a MEDICAL lead rather than a CONTACT one.
   *
   * That is not cosmetic: medical enquiries carry health information, and the server
   * gives that kind a 90-day retention window instead of two years
   * (`RETENTION_DAYS` in server/modules/leads/leads.service.ts). Handoff note 13.
   */
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: "", when: "", message: "", consent: true });
  const kind = form.topic === "Medical treatment" ? "MEDICAL" : "CONTACT";
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
      <PageHero eyebrow="Contact" title="Book a consultation"
        lead="A 30 minute call with someone who knows your case. Free, and no obligation afterwards."
        actions={<Button variant="outlineOnDark" size="lg" icon="building-2" onClick={() => go("about")}>See our offices</Button>} />

      <PageBody>
        <div className="ct-faq-inner" style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px,340px)", gap: "var(--space-12)", alignItems: "start" }}>
          <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
                <BrandMark size={80} />
                <Badge tone="brand" icon="check">Request received</Badge>
                <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Thank you{form.name ? `, ${form.name.split(" ")[0]}` : ""}.</h3>
                <BrandDivider style={{ maxWidth: 220 }} />
                <p style={{ maxWidth: 440, color: "var(--text-body)" }}>We will confirm your call slot on WhatsApp within one working day.</p>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                  <Button variant="secondary" onClick={() => go("home")}>Back to home</Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void submit(
                    {
                      name: form.name,
                      email: form.email,
                      phone: form.phone,
                      subject: form.topic,
                      // The call-time preference is part of the enquiry, not a separate
                      // field the server models — it belongs in the message a human reads.
                      message: [form.message, form.when && `Best time to call: ${form.when}`]
                        .filter(Boolean)
                        .join("\n\n"),
                      ...(kind === "MEDICAL" ? { treatment: form.message } : {}),
                    },
                    form.consent,
                  );
                }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
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

                  {/* The failure path. Without this the form can only ever appear to
                      succeed, which is the specific thing worse than having no form. */}
                  {state.status === "failed" ? (
                    <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                      <Icon name="alert-circle" size={16} />{state.message}
                    </span>
                  ) : null}

                  <Button variant="primary" size="lg" type="submit" disabled={state.status === "sending"}>
                    {state.status === "sending" ? "Sending…" : "Request my consultation"}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", position: "sticky", top: 140 }}>
            <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">Head office</span>
              {details.map(([ic, v]) => (
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
      </PageBody>
    </div>
  );
}
