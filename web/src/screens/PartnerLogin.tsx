"use client";

/**
 * Partner login and registration. Ported from site/Apply.jsx.
 *
 * There is no authentication behind this: signing in navigates. It needs a session
 * cookie set by your server and a guard on the dashboard route that redirects when it
 * is missing. Until then the portal is a demo of the surface, not a protected area.
 */

import { useState } from "react";
import { BrandDivider, Button, Checkbox, Icon, Input, Logo, Select, ASSETS } from "@/ds";
import { go } from "@/app/router";

export default function PartnerLogin() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "1.05fr 1fr" }}>
      <div style={{ background: "var(--gradient-brand-deep)", padding: "var(--section-y) var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--space-8)", justifyContent: "center" }}>
        <Logo variant="lockup" theme="reversed" height={96} assetBase={ASSETS} />
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
            {([["login", "Partner login"], ["register", "Register"]] as const).map(([k, label]) => (
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
              <Button variant="primary" size="lg" fullWidth onClick={() => go("portal/dashboard")}>Sign in</Button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: "var(--fs-h2)" }}>Become a partner</h3>
              <Input id="r-org" label="Organisation name" icon="building-2" placeholder="Bright Futures Education" required />
              <Select id="r-kind" label="You are a" options={["Education agency", "Consultant", "University", "Country representative"]} required />
              <Input id="r-email" label="Work email" type="email" icon="mail" placeholder="you@agency.com" required />
              <Checkbox id="r-terms" label="I agree to the partner terms" checked onChange={() => {}} />
              <Button variant="primary" size="lg" fullWidth onClick={() => go("partners")}>Create partner account</Button>
            </>
          )}

          <Button variant="ghost" icon="arrow-left" onClick={() => go("home")}>Back to the website</Button>
        </div>
      </div>
    </div>
  );
}
