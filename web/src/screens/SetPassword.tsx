"use client";

/**
 * Setting a password for the first time.
 *
 * **One page, two steps, no navigation.** The password is typed first, then a code
 * confirms it. Both live in the same component and the same form state, so asking for a
 * code never discards what has already been entered — which is the whole reason this is
 * a code and not an emailed link. A link would open a new tab, and the password typed in
 * the old one would be gone.
 *
 * The step is a reveal rather than a route: `step` moves from `"password"` to `"code"`
 * and the code field appears beneath the fields already filled in, which stay visible
 * and stay editable. Someone who realises they mistyped their email can fix it and ask
 * again without starting over.
 *
 * Where the code is auto-filled, it is a development affordance and it says so on
 * screen — see `server/lib/dev-codes.ts` for why it cannot happen in production. It is
 * labelled rather than silent because an unexplained pre-filled security code teaches
 * exactly the habit that makes phishing work.
 */

import { useState, type FormEvent } from "react";
import { BrandDivider, Button, Icon, Input, Logo, ASSETS } from "@/ds";
import { go } from "@/app/router";
import { requestSetupCode, setPasswordWithCode, signInWithPassword } from "@/features/auth/client";

/** Better Auth is configured with `minPasswordLength: 12`. Stated here so the field can
 *  say so before the server refuses, rather than after. */
const MIN_PASSWORD = 12;

type Step = "password" | "code" | "done";

export default function SetPassword() {
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [autofilled, setAutofilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordProblem = (): string | null => {
    if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
    if (password !== confirm) return "The two passwords do not match.";
    return null;
  };

  const askForCode = async (e: FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem();
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestSetupCode(email.trim());
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (result.code) {
      setCode(result.code);
      setAutofilled(true);
    }
    setStep("code");
  };

  const confirmCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await setPasswordWithCode(email.trim(), code.trim(), password);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }

    // Sign them in rather than returning them to a login form to retype what they just
    // chose. If this fails the password is still set, so the fallback is the sign-in
    // page and not an error — nothing has been lost.
    const signedIn = await signInWithPassword(email.trim(), password);
    setBusy(false);

    if (signedIn.ok) {
      go("portal/dashboard");
      return;
    }
    setStep("done");
  };

  return (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", background: "var(--surface-page)" }}>
      <div style={{ padding: "var(--section-y) var(--gutter)", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <Logo variant="lockup" theme="onLight" height={40} assetBase={ASSETS} />

          {step === "done" ? (
            <>
              <h1 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Your password is set</h1>
              <BrandDivider style={{ maxWidth: 200 }} />
              <p style={{ margin: 0, color: "var(--text-body)" }}>
                You can sign in now with your email and the password you just chose.
              </p>
              <Button variant="primary" size="lg" fullWidth onClick={() => go("portal")}>
                Go to sign in
              </Button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Set your password</h1>
              <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
                Campus Turkey has approved your account. Choose a password, then confirm the
                code we email you. You will not leave this page.
              </p>

              <form
                onSubmit={step === "password" ? askForCode : confirmCode}
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}
              >
                <Input
                  id="sp-email" label="Email address" type="email" icon="mail"
                  placeholder="you@agency.com" required autoComplete="username"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  id="sp-pass" label="New password" type="password" icon="lock"
                  hint={`At least ${MIN_PASSWORD} characters.`}
                  placeholder="••••••••••••" required autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <Input
                  id="sp-confirm" label="Confirm password" type="password" icon="lock"
                  placeholder="••••••••••••" required autoComplete="new-password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                />

                {step === "code" ? (
                  <>
                    <BrandDivider style={{ maxWidth: 160 }} />
                    <Input
                      id="sp-code" label="Confirmation code" icon="shield"
                      hint="Six digits. It expires in ten minutes and can be used once."
                      placeholder="123456" required inputMode="numeric" autoComplete="one-time-code"
                      value={code} onChange={(e) => { setCode(e.target.value); setAutofilled(false); }}
                    />

                    {autofilled ? (
                      /* Labelled, never silent. A code that appears by itself with no
                         explanation is training for the phishing email that does the
                         same thing. */
                      <span style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start", fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
                        <Icon name="info" size={14} />
                        <span>
                          Filled in for you because no email provider is configured on this
                          environment. On the live site this arrives by email only.
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
                        We have emailed your code. It can take a moment to arrive.
                      </span>
                    )}
                  </>
                ) : null}

                {error ? (
                  <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                    <Icon name="alert-circle" size={16} />{error}
                  </span>
                ) : null}

                <Button variant="primary" size="lg" fullWidth type="submit" disabled={busy}>
                  {busy
                    ? "Working…"
                    : step === "password"
                      ? "Send my code"
                      : "Confirm and sign in"}
                </Button>

                {step === "code" ? (
                  <Button
                    variant="ghost" type="button" disabled={busy}
                    onClick={(e) => { setStep("password"); void askForCode(e as unknown as FormEvent); }}
                  >
                    Send another code
                  </Button>
                ) : null}
              </form>
            </>
          )}

          <Button variant="ghost" icon="arrow-left" onClick={() => go("portal")}>
            Back to sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
