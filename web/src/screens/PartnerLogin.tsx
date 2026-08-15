"use client";

/**
 * Partner login and registration. Ported from site/Apply.jsx.
 *
 * There is no authentication behind this: signing in navigates. It needs a session
 * cookie set by your server and a guard on the dashboard route that redirects when it
 * is missing. Until then the portal is a demo of the surface, not a protected area.
 */

import { useState, type FormEvent } from "react";
import { BrandDivider, Button, Checkbox, Icon, Input, Logo, Select, ASSETS } from "@/ds";
import { go, useHref } from "@/app/router";
import { signInWithPassword } from "@/features/auth/client";
import { useLeadSubmit } from "@/features/leads/submit";

export default function PartnerLogin() {
  const href = useHref();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The registration tab.
   *
   * It posts a PARTNER lead through the same path every other public form uses. Before
   * this it posted nothing at all: the fields were uncontrolled, there was no form and
   * no handler, and "Create partner account" called `go("partners")` — so it navigated,
   * an applicant read that as success, and nothing was ever stored. Server-side
   * sign-up is disabled by design (`disableSignUp`), so the button could not have
   * created an account even if it had tried.
   */
  const [reg, setRegState] = useState({
    org: "", name: "", email: "", volume: "", terms: true,
  });
  const { state: registered, submit: submitRegistration } = useLeadSubmit("PARTNER");

  const setReg = (key: keyof typeof reg) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setRegState((f) => ({
        ...f,
        [key]: (e.target as HTMLInputElement).type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value,
      }));

  const register = async (e: FormEvent) => {
    e.preventDefault();
    await submitRegistration(
      { org: reg.org, name: reg.name, email: reg.email, volume: reg.volume },
      reg.terms,
    );
  };

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setError(null);

    const result = await signInWithPassword(email, password);

    if (result.ok) {
      // The dashboard checks the session server-side before it renders, so this is a
      // navigation rather than a promise that the session is good — if it were not,
      // that route would send the visitor straight back here.
      go("portal/dashboard");
      return;
    }

    setError(result.message);
    setSigningIn(false);
  };

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
              {/* A real form, so Enter submits and password managers recognise it —
                  both of which a pair of inputs beside a button does not give you. */}
              <form onSubmit={signIn} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                <Input id="p-email" label="Email address" type="email" icon="mail" placeholder="agency@example.com"
                  required autoComplete="username" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
                <Input id="p-pass" label="Password" type="password" icon="lock" placeholder="••••••••"
                  required autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
                  <Checkbox id="p-remember" label="Keep me signed in" checked onChange={() => {}} />
                  <a href={href("contact")} style={{ fontSize: "var(--fs-body-sm)" }}>Forgot password</a>
                </div>

                {error ? (
                  <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                    <Icon name="alert-circle" size={16} />{error}
                  </span>
                ) : null}

                <Button variant="primary" size="lg" fullWidth type="submit" disabled={signingIn}>
                  {signingIn ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </>
          ) : (
            <>
              {registered.status === "sent" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Application received</h3>
                  <p style={{ margin: 0, color: "var(--text-body)" }}>
                    We have your details. Someone reviews every application by hand, and your
                    named contact will call within one working day.
                  </p>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
                    Your login is created after that call. You cannot sign in yet, and this
                    form has not made you a password.
                  </p>
                  <Button variant="secondary" size="lg" fullWidth onClick={() => setTab("login")}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={register} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                  <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Become a partner</h3>
                  {/* Says what this does before anything is typed. The previous version
                      was headed "Create partner account" above a button that only
                      navigated — so an applicant reasonably believed they had an account,
                      and then could not sign in. */}
                  <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
                    This sends an application. Campus Turkey reviews it and creates your
                    login. Accounts are not opened automatically.
                  </p>

                  <Input id="r-org" label="Organisation name" icon="building-2"
                    placeholder="Bright Futures Education" required
                    value={reg.org} onChange={setReg("org")} />
                  <Input id="r-name" label="Your full name" icon="user"
                    placeholder="Amina Yusuf" required autoComplete="name"
                    value={reg.name} onChange={setReg("name")} />
                  <Select id="r-kind" label="You are a"
                    options={["Education agency", "Consultant", "University", "Country representative"]}
                    required value={reg.volume} onChange={setReg("volume")} />
                  <Input id="r-email" label="Work email" type="email" icon="mail"
                    placeholder="you@agency.com" required autoComplete="email"
                    value={reg.email} onChange={setReg("email")} />

                  <Checkbox id="r-terms" label="I agree to the partner terms"
                    checked={reg.terms}
                    onChange={(e) => setReg("terms")(e as never)} />

                  {registered.status === "failed" ? (
                    <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                      <Icon name="alert-circle" size={16} />{registered.message}
                    </span>
                  ) : null}

                  <Button variant="primary" size="lg" fullWidth type="submit"
                    disabled={registered.status === "sending"}>
                    {registered.status === "sending" ? "Sending…" : "Send application"}
                  </Button>
                </form>
              )}
            </>
          )}

          <Button variant="ghost" icon="arrow-left" onClick={() => go("home")}>Back to the website</Button>
        </div>
      </div>
    </div>
  );
}
