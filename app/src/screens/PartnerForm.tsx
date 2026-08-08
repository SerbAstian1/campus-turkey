/**
 * Partner and representative registration. Ported from site/Pages.jsx.
 *
 * No backend: submitting swaps to the confirmation panel unconditionally. Wire it to
 * your partners endpoint and handle the failure path before launch.
 */

import { useState, type FormEvent } from "react";
import { Badge, BrandDivider, Button, Card, Checkbox, Input, Select } from "@/ds";
import { BrandMark } from "@/components/Common";
import { go } from "@/app/router";

export function PartnerForm({
  kinds, submitLabel = "Submit registration", intro,
}: {
  kinds: string[];
  submitLabel?: string;
  intro?: string;
}) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    org: "", kind: "", country: "", name: "", email: "", phone: "", volume: "", terms: true,
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
    <Card padding="var(--space-10)" elevation="md" radius="var(--radius-xl)">
      {sent ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", textAlign: "center", padding: "var(--space-6) 0" }}>
          <BrandMark size={80} />
          <Badge tone="brand" icon="check">Registration received</Badge>
          <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Welcome{form.org ? `, ${form.org}` : ""}.</h3>
          <BrandDivider style={{ maxWidth: 220 }} />
          <p style={{ maxWidth: 460, color: "var(--text-body)" }}>Your agreement and portal login are on the way. Expect a call from your named contact within one working day.</p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="primary" icon="log-in" onClick={() => go("portal")}>Go to the portal</Button>
            <Button variant="secondary" onClick={() => setSent(false)}>Register another office</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setSent(true); }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
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
