"use client";

/**
 * The representative portal — brief §38, §57.
 *
 * **Composition: L-Arrangement**, the same one the staff console uses and for the same
 * reason. Sidebar anchors the left, header the top, lower-right open for the work. Eye
 * path: who am I and what am I looking at → the four counts → down the student rows.
 *
 * §57 says the UI may reuse the partner dashboard's components, and this does: the same
 * shell geometry, the same `gradient-brand-deep` sidebar, the same card language. What it
 * does not reuse is the partner's *vocabulary*. §56 is explicit that partner-facing copy
 * says "Partner"; this says "Representative" and "territory" throughout, because a person
 * who signed a territory agreement and reads "your agency" reasonably concludes they are
 * looking at somebody else's account.
 *
 * The counts are the four §57 names: Students Referred, Active Applications, Admissions,
 * Action Required. They are derived from stage rather than invented, and each is defined
 * where it is computed so the number on screen has a stated meaning.
 */

import { useMemo, useState, type FormEvent } from "react";
import { BrandDivider, Button, Card, Icon, Input, Logo, ASSETS } from "@/ds";
import { go } from "@/app/router";
import { useT } from "@/i18n/context";
import {
  referStudent, useReferredStudents, useRepresentativeProfile, when,
  type ReferredStudent, type Stage,
} from "@/features/representatives/data";

type View = "dashboard" | "students" | "profile";

/** Stages that mean the application is live and moving. */
const ACTIVE: Stage[] = ["DOCUMENTS", "SUBMITTED", "OFFER", "VISA"];
/** Stages where the representative is the blocker, not Campus Turkey. */
const NEEDS_ACTION: Stage[] = ["ENQUIRY", "DOCUMENTS"];

/**
 * The stage names a representative reads, keyed by the enum the API sends.
 *
 * A hook rather than a constant, and written out as literal `t()` calls, because the
 * extractor collects string literals: `t(STAGE_LABEL[stage])` would render translated
 * and never put "Enquiry" in the catalogue for anyone to translate.
 */
function useStageLabels(): Record<Stage, string> {
  const t = useT();

  return {
    ENQUIRY: t("Enquiry"),
    DOCUMENTS: t("Documents"),
    SUBMITTED: t("Submitted"),
    OFFER: t("Offer"),
    VISA: t("Visa"),
    REGISTERED: t("Registered"),
  };
}

export default function RepresentativePortal() {
  const t = useT();
  const [view, setView] = useState<View>("dashboard");
  const profile = useRepresentativeProfile();
  const students = useReferredStudents();

  const nav: { key: View; label: string; icon: string }[] = [
    { key: "dashboard", label: t("Dashboard"), icon: "layout-dashboard" },
    { key: "students", label: t("My Students"), icon: "users" },
    { key: "profile", label: t("Profile"), icon: "user" },
  ];

  const counts = useMemo(() => {
    const items = students.status === "ready" ? students.items : [];
    return {
      referred: items.length,
      active: items.filter((s) => ACTIVE.includes(s.stage)).length,
      admitted: items.filter((s) => s.stage === "REGISTERED").length,
      actionRequired: items.filter((s) => NEEDS_ACTION.includes(s.stage)).length,
    };
  }, [students]);

  return (
    <div
      className="ct-portal"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(240px,264px) 1fr",
        background: "var(--surface-subtle)",
        minHeight: "100dvh",
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
            {t("Representative")}
          </span>
          <span style={{ color: "var(--white)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)" }}>
            {profile?.fullName ?? t("Your account")}
          </span>
          {/* The territory is the agreement. Shown permanently, because every question a
              representative has about what they may claim is answered by it. */}
          {profile?.territory ? (
            <span style={{ color: "rgba(255,255,255,.72)", fontSize: "var(--fs-caption)" }}>
              {profile.territory}
            </span>
          ) : null}
        </div>

        <BrandDivider theme="dark" />

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map((item) => {
            const active = item.key === view;
            return (
              <button
                key={item.key} type="button" onClick={() => setView(item.key)}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-3)",
                  minHeight: 44, padding: "0 var(--space-4)",
                  borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                  textAlign: "left", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)",
                  fontWeight: active ? "var(--fw-semibold)" : "var(--fw-regular)",
                  background: active ? "rgba(255,255,255,.12)" : "transparent",
                  color: active ? "var(--white)" : "rgba(255,255,255,.78)",
                }}
              >
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
        {view === "dashboard" ? (
          <Dashboard counts={counts} students={students} onRefer={() => setView("students")} />
        ) : null}
        {view === "students" ? <Students students={students} /> : null}
        {view === "profile" ? <Profile /> : null}
      </main>
    </div>
  );
}

function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
      <h1 style={{ fontSize: "var(--fs-h2)", lineHeight: "var(--lh-heading)", letterSpacing: "var(--ls-heading)", color: "var(--text-heading)", margin: 0 }}>
        {title}
      </h1>
      <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)", maxWidth: "62ch" }}>{lead}</p>
    </header>
  );
}

function Dashboard({
  counts,
  students,
  onRefer,
}: {
  counts: { referred: number; active: number; admitted: number; actionRequired: number };
  students: ReturnType<typeof useReferredStudents>;
  onRefer: () => void;
}) {
  const t = useT();

  const tiles = [
    { label: t("Students referred"), value: counts.referred, note: t("Everyone you have registered.") },
    { label: t("Active applications"), value: counts.active, note: t("Moving through documents, offers and visas.") },
    { label: t("Admissions"), value: counts.admitted, note: t("Registered at a university.") },
    { label: t("Action required"), value: counts.actionRequired, note: t("Waiting on something from you.") },
  ];

  return (
    <>
      <Heading
        title={t("Dashboard")}
        lead={t("Everyone you have referred, and where each of them has reached.")}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-5)", marginBottom: "var(--space-8)" }}>
        {tiles.map((tile) => (
          <Card key={tile.label} padding="var(--space-6)" radius="var(--radius-lg)" elevation="sm">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", lineHeight: "var(--lh-tight)", color: "var(--text-heading)", fontVariantNumeric: "tabular-nums" }}>
                {tile.value}
              </span>
              <span style={{ color: "var(--text-heading)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)" }}>
                {tile.label}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>{tile.note}</span>
            </div>
          </Card>
        ))}
      </div>

      <StudentList students={students} emptyAction={onRefer} />
    </>
  );
}

function Students({ students }: { students: ReturnType<typeof useReferredStudents> }) {
  const t = useT();

  return (
    <>
      <Heading
        title={t("My Students")}
        lead={t("Register a student here and track them from enquiry to registration.")}
      />
      <ReferForm onDone={students.status === "ready" ? students.reload : () => {}} />
      <div style={{ marginTop: "var(--space-8)" }}>
        <StudentList students={students} />
      </div>
    </>
  );
}

function StudentList({
  students,
  emptyAction,
}: {
  students: ReturnType<typeof useReferredStudents>;
  emptyAction?: () => void;
}) {
  const t = useT();

  if (students.status === "loading") {
    return <p style={{ color: "var(--text-muted)" }}>{t("Loading your students…")}</p>;
  }

  if (students.status === "failed") {
    return (
      <Card padding="var(--space-6)" radius="var(--radius-lg)">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", alignItems: "flex-start" }}>
          <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
            <Icon name="alert-circle" size={16} />{students.message}
          </span>
          <Button variant="secondary" size="md" onClick={students.reload}>{t("Try again")}</Button>
        </div>
      </Card>
    );
  }

  if (students.items.length === 0) {
    // §81's exact empty state, which says what to do rather than only what is absent.
    return (
      <Card padding="var(--space-8)" radius="var(--radius-lg)">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", alignItems: "flex-start", maxWidth: "48ch" }}>
          <h3 style={{ margin: 0, fontSize: "var(--fs-h3)", color: "var(--text-heading)" }}>{t("No students yet.")}</h3>
          <p style={{ margin: 0, color: "var(--text-body)" }}>
            {t("Register a student to start tracking their progress.")}
          </p>
          {emptyAction ? (
            <Button variant="primary" size="md" onClick={emptyAction}>{t("Register Student")}</Button>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {students.items.map((student) => <StudentRow key={student.id} student={student} />)}
    </div>
  );
}

function StudentRow({ student }: { student: ReferredStudent }) {
  const stageLabels = useStageLabels();

  return (
    <Card padding="var(--space-6)" radius="var(--radius-lg)" elevation="sm">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-5)", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ color: "var(--text-heading)", fontSize: "var(--fs-body)", fontWeight: "var(--fw-medium)" }}>
            {student.name}
          </div>
          <div style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
            {student.program} · {student.universityName}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{
            fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)",
            fontWeight: "var(--fw-medium)", color: "var(--green-800)",
            background: "var(--green-050)", border: "1px solid var(--green-100)",
            borderRadius: "var(--radius-pill)", padding: "3px 10px",
          }}>
            {stageLabels[student.stage]}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", fontFamily: "var(--font-ui)" }}>
            {when(student.updatedAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Registering a student.
 *
 * University and programme are free text for now. The directory moves into the database
 * in the next phase and this becomes a picker at that point; a picker built against the
 * content files would have to be rebuilt a week later against the API.
 */
function ReferForm({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [form, setForm] = useState({ name: "", universityName: "", program: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await referStudent({
      name: form.name.trim(),
      universityName: form.universityName.trim(),
      // Derived until the directory is queryable. Kept in sync with the display name so
      // the record is still matchable once universities have real ids.
      universitySlug: form.universityName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      program: form.program.trim(),
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setForm({ name: "", universityName: "", program: "" });
    setDone(true);
    onDone();
  };

  return (
    <Card padding="var(--space-8)" radius="var(--radius-lg)" elevation="sm">
      <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        <h3 style={{ gridColumn: "span 2", margin: 0, fontSize: "var(--fs-h3)", color: "var(--text-heading)" }}>
          {t("Register a student")}
        </h3>

        <Input id="rs-name" label={t("Student's full name")} icon="user" required
          placeholder={t("Amina Yusuf")} value={form.name} onChange={set("name")}
          style={{ gridColumn: "span 2" }} />
        <Input id="rs-uni" label={t("University")} icon="building-2" required
          placeholder={t("Akdeniz University")} value={form.universityName} onChange={set("universityName")} />
        <Input id="rs-prog" label={t("Programme")} required
          placeholder={t("Dentistry")} value={form.program} onChange={set("program")} />

        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error ? (
            <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
              <Icon name="alert-circle" size={16} />{error}
            </span>
          ) : null}
          {done && !error ? (
            <span style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
              <Icon name="check" size={16} color="var(--green-600)" />
              {t("Registered. They appear in your list below.")}
            </span>
          ) : null}
          <Button variant="primary" size="lg" type="submit" disabled={busy}>
            {busy ? t("Registering…") : t("Register Student")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Profile() {
  const t = useT();
  const profile = useRepresentativeProfile();

  if (!profile) return <p style={{ color: "var(--text-muted)" }}>{t("Loading your profile…")}</p>;

  const rows: [string, string][] = [
    [t("Name"), profile.fullName],
    [t("Organisation"), profile.organizationName ?? t("Not given")],
    [t("Country"), profile.country],
    [t("Territory"), profile.territory ?? t("Not set")],
    [t("Email"), profile.email],
    [t("Phone"), profile.phone ?? t("Not given")],
    [t("Representative since"), when(profile.since)],
  ];

  return (
    <>
      <Heading
        title={t("Profile")}
        lead={t("Your details as Campus Turkey holds them. Ask your named contact to change your territory.")}
      />
      <Card padding="var(--space-8)" radius="var(--radius-lg)" elevation="sm">
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(140px,auto) 1fr", gap: "var(--space-4) var(--space-6)", margin: 0 }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: "contents" }}>
              <dt style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)" }}>{label}</dt>
              <dd style={{ margin: 0, color: "var(--text-heading)", fontSize: "var(--fs-body-sm)" }}>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div style={{ marginTop: "var(--space-6)" }}>
        <Button variant="ghost" icon="arrow-left" onClick={() => go("home")}>{t("Back to the website")}</Button>
      </div>
    </>
  );
}
