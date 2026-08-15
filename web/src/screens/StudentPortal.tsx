"use client";

/**
 * The student portal — brief §36, §55.
 *
 * **§55 sets the whole brief for this screen:** the student must immediately know where
 * they are, what happened, and what they need to do next. Most application trackers answer
 * the first two and leave the third implied, which is why applicants phone to ask whether
 * they need to do anything. Every status here carries an explicit next action, including
 * the ones where the honest answer is "nothing, wait" — because "nothing" is an answer,
 * and its absence is what generates the call.
 *
 * The composition puts the next action above the timeline. A timeline is a record and a
 * next action is an instruction; a reader scanning for what to do should not have to read
 * history first. When the applicant is the blocker, the card says so at the top of the
 * page in the status colour, and when they are not, it says that too.
 *
 * Shell geometry is the portal's, unchanged, so a student and a partner are recognisably
 * in the same product.
 */

import { useMemo, useState, type FormEvent } from "react";
import { BrandDivider, Button, Card, Icon, Input, Logo, ASSETS } from "@/ds";
import { go } from "@/app/router";
import { useT } from "@/i18n/context";
import {
  NEEDS_STUDENT, STATUS_COPY, claimRecord, useStudentDashboard, when,
  type StudentApplication, type StudentProfile,
} from "@/features/student/data";

type View = "dashboard" | "application" | "profile";

export default function StudentPortal() {
  const t = useT();
  const [view, setView] = useState<View>("dashboard");
  const dashboard = useStudentDashboard();

  /*
   * Written out as literal `t()` calls rather than held in a module constant. The
   * extractor collects string literals, so `t(label)` over a hoisted array would render
   * correctly in every locale and never reach the catalogue to be translated at all.
   */
  const nav: { key: View; label: string; icon: string }[] = [
    { key: "dashboard", label: t("Dashboard"), icon: "layout-dashboard" },
    { key: "application", label: t("My Application"), icon: "file-text" },
    { key: "profile", label: t("Profile"), icon: "user" },
  ];

  // Somebody who has not claimed a record has nothing to navigate. Showing a sidebar of
  // empty sections would suggest the account is broken rather than incomplete.
  if (dashboard.status === "unclaimed") {
    return <ClaimScreen message={dashboard.message} />;
  }

  return (
    <div
      className="ct-portal"
      style={{
        display: "grid", gridTemplateColumns: "minmax(240px,264px) 1fr",
        background: "var(--surface-subtle)", minHeight: "100dvh",
      }}
    >
      <aside
        className="ct-portal-aside"
        style={{
          position: "sticky", top: 0, alignSelf: "start", height: "100dvh",
          display: "flex", flexDirection: "column", gap: "var(--space-8)",
          padding: "var(--space-8) var(--space-6)",
          background: "var(--gradient-brand-deep)", boxSizing: "border-box",
        }}
      >
        <Logo variant="lockup" theme="reversed" height={40} assetBase={ASSETS} />

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-micro)", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>
            {t("Student")}
          </span>
          <span style={{ color: "var(--white)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)" }}>
            {dashboard.status === "ready" && dashboard.profile
              ? `${dashboard.profile.firstName} ${dashboard.profile.lastName}`
              : t("Your account")}
          </span>
        </div>

        <BrandDivider theme="dark" />

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map((item) => {
            const active = item.key === view;
            return (
              <button key={item.key} type="button" onClick={() => setView(item.key)}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-3)",
                  minHeight: 44, padding: "0 var(--space-4)", borderRadius: "var(--radius-sm)",
                  border: "none", cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)",
                  fontWeight: active ? "var(--fw-semibold)" : "var(--fw-regular)",
                  background: active ? "rgba(255,255,255,.12)" : "transparent",
                  color: active ? "var(--white)" : "rgba(255,255,255,.78)",
                }}>
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <a href="/portal" style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)", color: "rgba(255,255,255,.7)", fontSize: "var(--fs-body-sm)", fontFamily: "var(--font-ui)" }}>
          <Icon name="log-out" size={16} />
          {t("Sign out")}
        </a>
      </aside>

      <main style={{ padding: "var(--space-10) var(--space-8)", minWidth: 0 }}>
        {dashboard.status === "loading" ? <p style={{ color: "var(--text-muted)" }}>{t("Loading your application…")}</p> : null}

        {dashboard.status === "failed" ? (
          <Card padding="var(--space-8)" radius="var(--radius-lg)">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", alignItems: "flex-start" }}>
              <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--status-danger)" }}>
                <Icon name="alert-circle" size={18} />{dashboard.message}
              </span>
              <Button variant="secondary" onClick={dashboard.reload}>{t("Try again")}</Button>
            </div>
          </Card>
        ) : null}

        {dashboard.status === "ready" ? (
          <>
            {view === "dashboard" ? <Dashboard applications={dashboard.applications} name={dashboard.profile?.firstName ?? null} /> : null}
            {view === "application" ? <Applications applications={dashboard.applications} /> : null}
            {view === "profile" ? <Profile profile={dashboard.profile} /> : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
      <h1 style={{ fontSize: "var(--fs-h2)", lineHeight: "var(--lh-heading)", letterSpacing: "var(--ls-heading)", color: "var(--text-heading)", margin: 0 }}>{title}</h1>
      <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)", maxWidth: "62ch" }}>{lead}</p>
    </header>
  );
}

function Dashboard({ applications, name }: { applications: StudentApplication[]; name: string | null }) {
  const t = useT();
  // The one the applicant is most likely asking about: the most recently touched.
  const current = applications[0];

  const actionable = useMemo(
    () => applications.filter((a) => NEEDS_STUDENT.includes(a.status)),
    [applications],
  );

  if (!current) {
    return (
      <>
        <Heading title={name ? t("Welcome, {name}", { name }) : t("Welcome")} lead={t("Your application will appear here once it is started.")} />
        <Card padding="var(--space-8)" radius="var(--radius-lg)">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", alignItems: "flex-start", maxWidth: "48ch" }}>
            <h3 style={{ margin: 0, fontSize: "var(--fs-h3)", color: "var(--text-heading)" }}>{t("No application yet.")}</h3>
            <p style={{ margin: 0, color: "var(--text-body)" }}>
              {t("Start your application to begin your journey to Türkiye.")}
            </p>
            <Button variant="primary" onClick={() => go("apply")}>{t("Apply Now")}</Button>
          </div>
        </Card>
      </>
    );
  }

  const copy = STATUS_COPY[current.status];
  const waitingOnYou = NEEDS_STUDENT.includes(current.status);

  return (
    <>
      <Heading
        title={name ? t("Welcome, {name}", { name }) : t("Welcome")}
        lead={t("Where your application has reached, and what happens next.")}
      />

      {/* Where am I, and what does it mean. The status is stated in words the applicant
          uses, with the system's own vocabulary nowhere on screen. */}
      <Card padding="var(--space-8)" radius="var(--radius-lg)" elevation="sm">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-micro)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            {t("Application {number}", { number: current.applicationNumber })}
          </span>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", lineHeight: "var(--lh-tight)", color: "var(--text-heading)" }}>
            {copy.label}
          </h2>
          <p style={{ margin: 0, color: "var(--text-body)", maxWidth: "60ch" }}>{copy.meaning}</p>
          {current.university ? (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
              {current.program ? `${current.program.name} · ` : ""}{current.university.name}, {current.university.city}
            </p>
          ) : null}
        </div>
      </Card>

      {/* What do I need to do next. Above the timeline on purpose: a timeline is a record,
          a next action is an instruction, and somebody scanning for what to do should not
          have to read history first. */}
      <Card
        padding="var(--space-8)"
        radius="var(--radius-lg)"
        elevation="sm"
        style={{
          marginTop: "var(--space-5)",
          // Emphasis only when the applicant is genuinely the blocker. Highlighting every
          // state teaches people to ignore the highlight.
          borderLeft: waitingOnYou ? "3px solid var(--status-warning)" : "3px solid var(--green-300)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--text-heading)" }}>
            <Icon name={waitingOnYou ? "alert-circle" : "check"} size={16} color={waitingOnYou ? "var(--status-warning)" : "var(--green-600)"} />
            {waitingOnYou ? t("Waiting on you") : t("Nothing needed from you")}
          </span>
          <p style={{ margin: 0, color: "var(--text-body)", maxWidth: "60ch" }}>{copy.next}</p>
        </div>
      </Card>

      {actionable.length > 1 ? (
        <p style={{ marginTop: "var(--space-5)", color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
          {t("{count} of your applications are waiting on you. See My Application.", { count: actionable.length })}
        </p>
      ) : null}

      {applications.length > 1 ? (
        <div style={{ marginTop: "var(--space-8)" }}>
          <h3 style={{ fontSize: "var(--fs-h3)", color: "var(--text-heading)", marginBottom: "var(--space-4)" }}>
            {t("Your other applications")}
          </h3>
          <ApplicationList applications={applications.slice(1)} />
        </div>
      ) : null}
    </>
  );
}

function Applications({ applications }: { applications: StudentApplication[] }) {
  const t = useT();

  return (
    <>
      <Heading title={t("My Application")} lead={t("Every application you have with Campus Turkey.")} />
      {applications.length === 0 ? (
        <Card padding="var(--space-8)" radius="var(--radius-lg)">
          <p style={{ margin: 0, color: "var(--text-body)" }}>{t("No application yet.")}</p>
        </Card>
      ) : (
        <ApplicationList applications={applications} />
      )}
    </>
  );
}

function ApplicationList({ applications }: { applications: StudentApplication[] }) {
  const t = useT();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {applications.map((a) => {
        const copy = STATUS_COPY[a.status];
        const waitingOnYou = NEEDS_STUDENT.includes(a.status);
        return (
          <Card key={a.id} padding="var(--space-6)" radius="var(--radius-lg)" elevation="sm">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-5)", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <div style={{ color: "var(--text-heading)", fontSize: "var(--fs-body)", fontWeight: "var(--fw-medium)" }}>
                  {copy.label}
                </div>
                <div style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
                  {a.university ? `${a.university.name}, ${a.university.city}` : t("University not chosen yet")}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", marginTop: 2 }}>
                  {t("{number} · updated {when}", { number: a.applicationNumber, when: when(a.updatedAt) })}
                </div>
              </div>
              {waitingOnYou ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)", color: "var(--text-heading)", background: "var(--green-050)", border: "1px solid var(--green-100)", borderRadius: "var(--radius-pill)", padding: "4px 10px" }}>
                  <Icon name="alert-circle" size={13} color="var(--status-warning)" />
                  {t("Waiting on you")}
                </span>
              ) : null}
            </div>
            <p style={{ margin: "var(--space-4) 0 0", color: "var(--text-body)", fontSize: "var(--fs-body-sm)", maxWidth: "60ch" }}>
              {copy.next}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

function Profile({ profile }: { profile: StudentProfile | null }) {
  const t = useT();

  if (!profile) return <p style={{ color: "var(--text-muted)" }}>{t("No profile yet.")}</p>;

  const rows: [string, string][] = [
    [t("Name"), `${profile.firstName} ${profile.lastName}`],
    [t("Nationality"), profile.nationality],
    [t("Country of residence"), profile.countryOfResidence],
    [t("Phone"), profile.phone ?? t("Not given")],
    [t("Address"), profile.address ?? t("Not given")],
  ];

  return (
    <>
      <Heading title={t("Profile")} lead={t("Your details as Campus Turkey holds them.")} />
      <Card padding="var(--space-8)" radius="var(--radius-lg)" elevation="sm">
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(150px,auto) 1fr", gap: "var(--space-4) var(--space-6)", margin: 0 }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: "contents" }}>
              <dt style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)" }}>{label}</dt>
              <dd style={{ margin: 0, color: "var(--text-heading)", fontSize: "var(--fs-body-sm)" }}>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}

/**
 * The screen for a signed-in student who has not claimed a record.
 *
 * A normal state, not an error. They have an account because they created one; the record
 * belongs to whoever referred them, and the code is how the two are joined.
 */
function ClaimScreen({ message }: { message: string }) {
  const t = useT();
  const [form, setForm] = useState({
    claimCode: "", firstName: "", lastName: "", nationality: "", countryOfResidence: "", phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await claimRecord({
      claimCode: form.claimCode.trim().toUpperCase(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nationality: form.nationality.trim(),
      countryOfResidence: form.countryOfResidence.trim(),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    // A full reload rather than a state flip: the dashboard, the sidebar and the
    // navigation all change at once, and re-fetching everything is simpler to reason
    // about than orchestrating that.
    window.location.reload();
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface-page)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--section-y) var(--gutter)" }}>
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <Logo variant="lockup" theme="onLight" height={40} assetBase={ASSETS} />
        <h1 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Connect your application")}</h1>
        <p style={{ margin: 0, color: "var(--text-body)" }}>{message}</p>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
          {t("Your agency or representative has a short code for you. Entering it links your application to this account.")}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Input id="c-code" label={t("Your code")} icon="key" required
            hint={t("Eight characters, from your agency.")}
            placeholder={t("A7KP2MRQ")}
            value={form.claimCode} onChange={set("claimCode")} />
          <Input id="c-first" label={t("First name")} required value={form.firstName} onChange={set("firstName")} />
          <Input id="c-last" label={t("Last name")} required value={form.lastName} onChange={set("lastName")} />
          <Input id="c-nat" label={t("Nationality")} required placeholder={t("Nigerian")} value={form.nationality} onChange={set("nationality")} />
          <Input id="c-res" label={t("Country you live in")} required placeholder={t("Nigeria")} value={form.countryOfResidence} onChange={set("countryOfResidence")} />
          <Input id="c-phone" label={t("WhatsApp number")} hint={t("Optional. Include your country code.")} value={form.phone} onChange={set("phone")} />

          {error ? (
            <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
              <Icon name="alert-circle" size={16} />{error}
            </span>
          ) : null}

          <Button variant="primary" size="lg" fullWidth type="submit" disabled={busy}>
            {busy ? t("Connecting…") : t("Connect my application")}
          </Button>
        </form>
      </div>
    </div>
  );
}
