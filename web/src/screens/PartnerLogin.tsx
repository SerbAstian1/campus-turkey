"use client";

/**
 * The sign-in page, for all four kinds of people who hold a Campus Turkey account.
 *
 * **Why a role chooser exists here, and what it can honestly do.** There is one door.
 * Everything around it used to say "partner", so a student, representative or staff
 * member had no reason to think it was theirs. The chooser answers that, and it governs
 * what the Register side asks for, because the four relationships genuinely differ: a
 * partner is an organisation, a representative is a person with a territory, a student is
 * an applicant, and a staff member is somebody Campus Turkey employs.
 *
 * **It deliberately does not gate signing in.** Authentication is by email and password;
 * the role lives in the database and is authoritative there. Checking the chosen role
 * against the real one would add a failure mode that fires on a *correct* password, and
 * would tell an anonymous visitor which role an address belongs to. It buys nothing: the
 * portal already routes by real role once the session exists (see the junction in
 * `app/[locale]/portal/dashboard/page.tsx`). So on the sign-in side the choice changes
 * the copy — which tells you where you are about to land — and nothing else. Picking the
 * "wrong" one signs you in and sends you to your own portal regardless.
 *
 * **Registration does not create accounts, for anybody.** `disableSignUp` is on in
 * `server/lib/auth.ts`. Every one of these forms submits an enquiry or an application
 * that a person reads; the login is created afterwards, by Campus Turkey. Each
 * confirmation says so in as many words, because the failure this page has already had
 * once was an applicant reading "received" as "registered", trying to sign in, and
 * concluding the site was broken.
 *
 * Staff therefore get no registration form at all. An empty form that quietly does
 * nothing would be worse than the honest sentence that replaces it.
 */

import { useState, type FormEvent } from "react";
import { BrandDivider, Button, Card, Checkbox, Icon, Input, Logo, Select, ASSETS } from "@/ds";
import { RepresentativeForm } from "@/screens/RepresentativeForm";
import { go, useHref } from "@/app/router";
import { signInWithPassword } from "@/features/auth/client";
import { useLeadSubmit } from "@/features/leads/submit";
import { useT } from "@/i18n/context";
import { useTranslatedOptions } from "@/i18n/options";

type Role = "STUDENT" | "PARTNER" | "REPRESENTATIVE" | "STAFF";

/**
 * Canonical English, because this value is submitted with the lead and read by staff.
 * Hoisted for `useTranslatedOptions`, which memoises on array identity.
 */
const PARTNER_KINDS = ["Education agency", "Consultant", "University", "Country representative"] as const;

const COUNTRIES = ["Nigeria", "Morocco", "Kenya", "Egypt", "Pakistan", "Indonesia", "Other"] as const;

/**
 * Study levels, with the value the API accepts attached to the label that offers it.
 *
 * `Apply.tsx` keeps these as two structures, a list and a `LEVEL_FOR` map, and has to
 * assert they stay in step because a label missing from the map submits `undefined`.
 * One object per level cannot drift: the label and the enum value are the same literal.
 */
const STUDY_LEVELS = [
  { value: "foundation", label: "Foundation or language year" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "master", label: "Master's degree" },
  { value: "phd", label: "PhD" },
] as const;

const LEVEL_LABELS = STUDY_LEVELS.map((l) => l.label) as unknown as readonly string[];

/** A hook, not a constant — see the note in About.tsx. */
function usePortalBenefits(): string[] {
  const t = useT();

  return [
    t("Track every student you refer"),
    t("See commission and payment status"),
    t("Download university brochures and price lists"),
    t("Register new applicants in one form"),
  ];
}

/** What each role is called, and the icon that carries it at a glance. */
function useRoles(): { key: Role; label: string; icon: string }[] {
  const t = useT();

  return [
    { key: "STUDENT", label: t("Student"), icon: "graduation-cap" },
    { key: "PARTNER", label: t("Partner"), icon: "building" },
    { key: "REPRESENTATIVE", label: t("Representative"), icon: "users" },
    { key: "STAFF", label: t("Staff"), icon: "shield" },
  ];
}

/**
 * Where signing in takes each role.
 *
 * Named rather than implied, so the redirect that follows is expected. Staff especially:
 * nothing else on the public site mentions the console, and without this the jump to it
 * reads as the site losing track of where you were going.
 */
function useDestination(): Record<Role, string> {
  const t = useT();

  return {
    STUDENT: t("You will be taken to your student portal."),
    PARTNER: t("You will be taken to your partner dashboard."),
    REPRESENTATIVE: t("You will be taken to your representative portal."),
    STAFF: t("You will be taken to the staff console."),
  };
}

export default function PartnerLogin() {
  const href = useHref();
  const t = useT();
  const benefits = usePortalBenefits();
  const roles = useRoles();
  const destination = useDestination();
  const kinds = useTranslatedOptions(PARTNER_KINDS);
  const countries = useTranslatedOptions(COUNTRIES);
  const levels = useTranslatedOptions(LEVEL_LABELS);

  const [role, setRole] = useState<Role>("STUDENT");
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The partner application.
   *
   * It posts a PARTNER lead through the same path every other public form uses. Before
   * this it posted nothing at all: the fields were uncontrolled, there was no form and
   * no handler, and "Create partner account" called `go("partners")` — so it navigated,
   * an applicant read that as success, and nothing was ever stored.
   */
  const [reg, setRegState] = useState({
    org: "", name: "", email: "", volume: "", terms: true,
  });
  const { state: registered, submit: submitRegistration } = useLeadSubmit("PARTNER");

  /** The student enquiry. A STUDY lead, the same kind `/apply` sends. */
  const [study, setStudyState] = useState({
    name: "", email: "", phone: "", country: "", program: "", level: "", consent: true,
  });
  const { state: enquired, submit: submitEnquiry } = useLeadSubmit("STUDY");

  const setReg = (key: keyof typeof reg) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setRegState((f) => ({
        ...f,
        [key]: (e.target as HTMLInputElement).type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value,
      }));

  const setStudy = (key: keyof typeof study) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStudyState((f) => ({
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

  const enquire = async (e: FormEvent) => {
    e.preventDefault();
    await submitEnquiry(
      {
        name: study.name,
        email: study.email,
        // Omitted rather than sent empty: the schema bounds these when present, and a
        // blank string is not a phone number or a country.
        ...(study.phone.trim() ? { phone: study.phone.trim() } : {}),
        ...(study.country ? { country: study.country } : {}),
        ...(study.program.trim() ? { program: study.program.trim() } : {}),
        ...(study.level ? { level: study.level } : {}),
      },
      study.consent,
    );
  };

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setError(null);

    const result = await signInWithPassword(email, password);

    if (result.ok) {
      // The dashboard resolves the session server-side and forwards by the account's
      // real role, so this one navigation serves all four. It is not a promise that the
      // session is good: if it were not, that route sends the visitor straight back.
      go("portal/dashboard");
      return;
    }

    setError(result.message);
    setSigningIn(false);
  };

  // The representative application is a full two-column form and needs the room; the
  // sign-in form is two fields and looks abandoned in a wide column.
  const wide = tab === "register" && role === "REPRESENTATIVE";

  return (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "1.05fr 1fr" }}>
      <div style={{ background: "var(--gradient-brand-deep)", padding: "var(--section-y) var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--space-8)", justifyContent: "center" }}>
        <Logo variant="lockup" theme="reversed" height={96} assetBase={ASSETS} />
        <h1 style={{ color: "var(--white)", fontSize: "var(--fs-h1)", lineHeight: "var(--lh-display)", maxWidth: 460, margin: 0 }}>{t("The Campus Turkey portal")}</h1>
        <BrandDivider theme="dark" style={{ maxWidth: 280 }} />
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 420 }}>
          {/* `benefit`, not `t` — the parameter shadowed the translator. */}
          {benefits.map((benefit) => (
            <li key={benefit} style={{ display: "flex", gap: "var(--space-3)", color: "rgba(255,255,255,.88)", fontSize: "var(--fs-body)" }}>
              <Icon name="check" size={18} color="var(--green-300)" strokeWidth={2.5} />{benefit}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ background: "var(--surface-page)", padding: "var(--section-y) var(--gutter)", display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: wide ? 640 : 420, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <RoleChooser roles={roles} value={role} onChange={(next) => { setRole(next); setError(null); }} />

          <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-pill)", background: "var(--surface-subtle)", border: "1px solid var(--border-subtle)" }}>
            {([["login", t("Sign in")], ["register", t("Register")]] as const).map(([k, label]) => (
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
              <h3 style={{ fontSize: "var(--fs-h2)" }}>{t("Welcome back")}</h3>
              {/* A real form, so Enter submits and password managers recognise it —
                  both of which a pair of inputs beside a button does not give you. */}
              <form onSubmit={signIn} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                <Input id="p-email" label={t("Email address")} type="email" icon="mail" placeholder="you@example.com"
                  required autoComplete="username" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
                <Input id="p-pass" label={t("Password")} type="password" icon="lock" placeholder="••••••••"
                  required autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
                  <Checkbox id="p-remember" label={t("Keep me signed in")} checked onChange={() => {}} />
                  <a href={href("contact")} style={{ fontSize: "var(--fs-body-sm)" }}>{t("Forgot password")}</a>
                </div>

                {error ? (
                  <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                    <Icon name="alert-circle" size={16} />{error}
                  </span>
                ) : null}

                <Button variant="primary" size="lg" fullWidth type="submit" disabled={signingIn}>
                  {signingIn ? t("Signing in…") : t("Sign in")}
                </Button>
              </form>

              {/* The only thing the role choice changes on this side. One password field
                  cannot differ by role, and pretending otherwise would be theatre. */}
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)" }}>
                <Icon name="log-in" size={14} /> {destination[role]}{" "}
                {t("Whichever role you pick here, you are taken to the one your account holds.")}
              </p>
            </>
          ) : (
            <>
              {role === "STAFF" ? <StaffNotice onBack={() => setTab("login")} /> : null}

              {role === "REPRESENTATIVE" ? (
                <>
                  <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Become a representative")}</h3>
                  <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
                    {t("Represent Campus Turkey in your country. This sends an application for review.")}
                  </p>
                  {/* The real form, not a copy of it. One implementation of representative
                      intake, so the fields here cannot drift from the ones the queue reads. */}
                  <RepresentativeForm />
                </>
              ) : null}

              {role === "PARTNER" ? (
                registered.status === "sent" ? (
                  <Received
                    title={t("Application received")}
                    body={t("We have your details. Someone reviews every application by hand, and your named contact will call within one working day.")}
                    onBack={() => setTab("login")}
                  />
                ) : (
                  <form onSubmit={register} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                    <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Become a partner")}</h3>
                    {/* Says what this does before anything is typed. The previous version
                        was headed "Create partner account" above a button that only
                        navigated — so an applicant reasonably believed they had an account,
                        and then could not sign in. */}
                    <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
                      {t("This sends an application. Campus Turkey reviews it and creates your login. Accounts are not opened automatically.")}
                    </p>

                    <Input id="r-org" label={t("Organisation name")} icon="building"
                      placeholder={t("Bright Futures Education")} required
                      value={reg.org} onChange={setReg("org")} />
                    <Input id="r-name" label={t("Your full name")} icon="user"
                      placeholder={t("Amina Yusuf")} required autoComplete="name"
                      value={reg.name} onChange={setReg("name")} />
                    <Select id="r-kind" label={t("You are a")}
                      options={kinds.options}
                      value={kinds.display(reg.volume)}
                      onChange={(e) => setRegState((f) => ({ ...f, volume: kinds.toEnglish(e.target.value) }))}
                      required />
                    <Input id="r-email" label={t("Work email")} type="email" icon="mail"
                      placeholder="you@agency.com" required autoComplete="email"
                      value={reg.email} onChange={setReg("email")} />

                    <Checkbox id="r-terms" label={t("I agree to the partner terms")}
                      checked={reg.terms}
                      onChange={(e) => setReg("terms")(e as never)} />

                    {registered.status === "failed" ? (
                      <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                        <Icon name="alert-circle" size={16} />{registered.message}
                      </span>
                    ) : null}

                    <Button variant="primary" size="lg" fullWidth type="submit"
                      disabled={registered.status === "sending"}>
                      {registered.status === "sending" ? t("Sending…") : t("Send application")}
                    </Button>
                  </form>
                )
              ) : null}

              {role === "STUDENT" ? (
                enquired.status === "sent" ? (
                  <Received
                    title={t("Enquiry received")}
                    body={t("A Campus Turkey counsellor will contact you about studying in Türkiye. Your portal login is created once your application is under way.")}
                    onBack={() => setTab("login")}
                  />
                ) : (
                  <form onSubmit={enquire} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                    <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Study in Türkiye")}</h3>
                    <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
                      {t("Tell us what you want to study and a counsellor will get in touch. This is an enquiry, not an account.")}
                    </p>

                    <Input id="s-name" label={t("Your full name")} icon="user"
                      placeholder={t("Amina Yusuf")} required autoComplete="name"
                      value={study.name} onChange={setStudy("name")} />
                    <Input id="s-email" label={t("Email address")} type="email" icon="mail"
                      placeholder="you@example.com" required autoComplete="email"
                      value={study.email} onChange={setStudy("email")} />
                    <Input id="s-phone" label={t("WhatsApp number (optional)")} icon="phone"
                      placeholder="+234 800 000 0000" autoComplete="tel"
                      value={study.phone} onChange={setStudy("phone")} />
                    <Select id="s-country" label={t("Country you are in")}
                      options={countries.options}
                      value={countries.display(study.country)}
                      onChange={(e) => setStudyState((f) => ({ ...f, country: countries.toEnglish(e.target.value) }))} />
                    <Select id="s-level" label={t("Level you are applying for")}
                      options={levels.options}
                      value={levels.display(labelForLevel(study.level))}
                      onChange={(e) => setStudyState((f) => ({ ...f, level: levelForLabel(levels.toEnglish(e.target.value)) }))} />
                    <Input id="s-program" label={t("What do you want to study?")} icon="book-open"
                      placeholder={t("Medicine, engineering, business")}
                      value={study.program} onChange={setStudy("program")} />

                    <Checkbox id="s-consent" label={t("Campus Turkey may contact me about this enquiry")}
                      checked={study.consent}
                      onChange={(e) => setStudy("consent")(e as never)} />

                    {enquired.status === "failed" ? (
                      <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
                        <Icon name="alert-circle" size={16} />{enquired.message}
                      </span>
                    ) : null}

                    <Button variant="primary" size="lg" fullWidth type="submit"
                      disabled={enquired.status === "sending"}>
                      {enquired.status === "sending" ? t("Sending…") : t("Send enquiry")}
                    </Button>
                  </form>
                )
              ) : null}
            </>
          )}

          <Button variant="ghost" icon="arrow-left" onClick={() => go("home")}>{t("Back to the website")}</Button>
        </div>
      </div>
    </div>
  );
}

/** Enum value to the label that offers it, and back. Neither can drift from the other. */
const labelForLevel = (value: string) =>
  STUDY_LEVELS.find((l) => l.value === value)?.label ?? "";
const levelForLabel = (label: string) =>
  STUDY_LEVELS.find((l) => l.label === label)?.value ?? "";

/**
 * The role chooser.
 *
 * `aria-pressed` rather than tabs, because these are not panels of one document: the
 * choice persists across the sign-in and register tabs below, and a tab pattern would
 * promise that switching replaces everything under it.
 *
 * Compact by request: 24px tall, icon and label on one line, wrapping rather than
 * stretching. That is exactly WCAG 2.2 SC 2.5.8's floor for a pointer target (24 by 24
 * CSS pixels) and it is met on the nose rather than comfortably, which is worth knowing
 * if these ever gain a sibling control: every other control on this page sits at 40 to
 * 44px. The `gap` between them is what keeps the spacing exception satisfied, so the
 * buttons must not be packed flush together later.
 */
function RoleChooser({
  roles, value, onChange,
}: {
  roles: { key: Role; label: string; icon: string }[];
  value: Role;
  onChange: (role: Role) => void;
}) {
  const t = useT();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <span className="ct-eyebrow" style={{ color: "var(--text-muted)" }}>{t("I am a")}</span>
      <div
        role="group"
        aria-label={t("Choose your role")}
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}
      >
        {roles.map((role) => {
          const active = role.key === value;
          return (
            <button
              key={role.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(role.key)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: 6, height: 24, padding: "0 var(--space-3)",
                borderRadius: "var(--radius-pill)", cursor: "pointer", whiteSpace: "nowrap",
                fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)",
                fontWeight: active ? "var(--fw-semibold)" : "var(--fw-regular)",
                // Border and weight carry the active state, not a brand fill: white on
                // --action-primary measures 2.84:1 and fails AA, the same reason the
                // staff console's filters are built this way.
                background: active ? "var(--green-050)" : "var(--white)",
                border: `1px solid ${active ? "var(--green-600)" : "var(--border-subtle)"}`,
                color: active ? "var(--green-800)" : "var(--text-body)",
                transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
              }}
            >
              <Icon name={role.icon} size={14} color={active ? "var(--green-600)" : "var(--text-muted)"} />
              {role.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * What staff see instead of a registration form.
 *
 * `disableSignUp` is on, so no form on this page could create their account even if one
 * existed. Saying so is the whole content: a form that silently does nothing is the
 * exact failure this page has already had once.
 */
function StaffNotice({ onBack }: { onBack: () => void }) {
  const t = useT();

  return (
    <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Icon name="shield" size={28} color="var(--green-600)" />
      <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Staff accounts are created for you")}</h3>
      <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)" }}>
        {t("Campus Turkey opens staff accounts internally, and there is no sign-up here. Ask an administrator to create yours. They will pass you a one-time password directly, never by email or chat, and you should change it the first time you sign in.")}
      </p>
      <Button variant="secondary" size="lg" fullWidth onClick={onBack}>{t("Back to sign in")}</Button>
    </Card>
  );
}

/**
 * The confirmation, shared by the partner and student forms.
 *
 * Both end by saying no account exists yet, in the same words, because that is the
 * sentence whose absence broke this page before.
 */
function Received({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  const t = useT();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h3 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--text-body)" }}>{body}</p>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
        {t("This form has not created an account or a password. There is nothing to sign in with yet.")}
      </p>
      <Button variant="secondary" size="lg" fullWidth onClick={onBack}>{t("Back to sign in")}</Button>
    </div>
  );
}
