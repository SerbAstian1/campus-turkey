"use client";

/**
 * Partner portal. Ported from site/Portal.jsx.
 *
 * Money is held in minor units and formatted at the edge, and payout details are
 * masked — the two corrections carried over from the earlier pass. Withdrawals ask the
 * server through `requestWithdrawal`; with no server yet, a failed call falls back to a
 * local demo update in development only.
 */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Badge, BrandDivider, Button, Card, Checkbox, Icon, IconButton, Input, LanguageSwitcher,
  Logo, Select, Tag, ASSETS,
} from "@/ds";
import { portal as content, universities, type PayoutMethod, type PortalStudent, type Withdrawal } from "@/content";
import { formatMinor, newIdempotencyKey, requestWithdrawal } from "@/features/portal/withdrawals";
import { usePortalData, type PortalData } from "@/features/portal/data";
import { useLocaleSwitch } from "@/i18n/switch";
import { useT } from "@/i18n/context";
import { useTranslatedOptions } from "@/i18n/options";
import { go, useHref } from "@/app/router";
import { toast } from "@/app/toast";
import { CardGrid } from "@/components/CardGrid";
import { ErrorScreen } from "./Errors";

const STAGE_TONE: Record<PortalStudent["stage"], "brand" | "neutral" | "warning"> = {
  Registered: "brand", Visa: "brand", Offer: "neutral", Submitted: "neutral", Documents: "warning", Enquiry: "neutral",
};

const CURRENCY = content.wallet.currency;
const money = (minor: number) => formatMinor(minor, CURRENCY);

/* ---------------------------------------------------------------------- sheet */

/**
 * Right-hand panel. The design system has no Modal, and a portal needs one place to put
 * a short task without losing the page behind it.
 *
 * Rendered into document.body: the page wrapper keeps a settled transform from its
 * route-reveal animation, and any transformed ancestor becomes the containing block for
 * position:fixed, which would size this overlay to the page instead of the screen.
 */
function PortalSheet({
  open, title, lead, onClose, children,
}: {
  open: boolean; title: string; lead?: string; onClose: () => void; children: ReactNode;
}) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () => [...(panel.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ) ?? [])].filter((el) => el.offsetParent !== null);

    (focusables()[1] ?? focusables()[0])?.focus();

    /* Tab is trapped inside the panel, and focus returns to the opener on close. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const edge = e.shiftKey ? list[0] : list[list.length - 1];
      if (document.activeElement === edge || !panel.current?.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? list[list.length - 1] : list[0])?.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <button type="button" aria-label={t("Close")} onClick={onClose}
        style={{ position: "absolute", inset: 0, border: "none", cursor: "pointer", background: "rgba(10,44,30,.42)", backdropFilter: "blur(4px)" }} />
      <div className="ct-sheet" ref={panel} style={{
        position: "relative", width: "min(560px,100%)", height: "100%", overflowY: "auto", boxSizing: "border-box",
        background: "var(--surface-page)", boxShadow: "var(--shadow-float)",
        padding: "var(--space-10)", display: "flex", flexDirection: "column", gap: "var(--space-6)",
      }}>
        <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{title}</h2>
            {lead ? <p style={{ color: "var(--text-body)", margin: 0 }}>{lead}</p> : null}
          </div>
          <IconButton icon="x" label={t("Close")} onClick={onClose} />
        </div>
        <BrandDivider />
        {children}
      </div>
    </div>,
    document.body,
  );
}

function FormError({ message }: { message: string }) {
  return (
    <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
      <Icon name="alert-circle" size={16} />{message}
    </span>
  );
}

/* ---------------------------------------------------------------- add student */

/**
 * The two select lists, as canonical English.
 *
 * Hoisted for the reason `useTranslatedOptions` documents: it memoises on the array
 * identity, so a literal inside the component would rebuild the lookup every render.
 * These are the values the record carries; only the labels are translated.
 */
const LEVELS = ["Bachelor", "Master", "PhD", "Language year"] as const;
const INTAKES = ["Autumn 2026", "Spring 2027", "Autumn 2027"] as const;

function AddStudentForm({ onAdd, onClose }: { onAdd: (s: PortalStudent) => void; onClose: () => void }) {
  const t = useT();
  const levels = useTranslatedOptions(LEVELS);
  const intakes = useTranslatedOptions(INTAKES);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", country: "", program: "", university: "", level: "", intake: "", notes: "", consent: true,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({
        ...f,
        [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value,
      }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.program.trim() || !form.university) {
      setError(t("Add the student's name, the program and a university before you submit."));
      return;
    }
    onAdd({
      id: `st-${Date.now()}`, name: form.name.trim(), program: form.program.trim(),
      university: form.university, stage: "Enquiry", updated: t("Just now"), commissionMinor: 0,
    });
    onClose();
    toast(t("{name} was added to your pipeline.", { name: form.name.trim() }));
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "var(--space-5)" }}>
      <Input id="s-name" label={t("Student name")} icon="user" placeholder={t("Amina Yusuf")} required value={form.name} onChange={set("name")} style={{ gridColumn: "span 2", minWidth: 0 }} />
      <Input id="s-email" label={t("Email address")} type="email" icon="mail" placeholder="student@example.com" value={form.email} onChange={set("email")} style={{ minWidth: 0 }} />
      <Input id="s-phone" label={t("WhatsApp number")} icon="phone" hint={t("Include the country code.")} value={form.phone} onChange={set("phone")} style={{ minWidth: 0 }} />
      <Input id="s-country" label={t("Country of residence")} icon="globe" placeholder={t("Nigeria")} value={form.country} onChange={set("country")} style={{ minWidth: 0 }} />
      {/* Label translated, stored value English — the record and the admissions team are
          keyed by the English list. See `useTranslatedOptions`. */}
      <Select id="s-level" label={t("Study level")} options={levels.options} value={levels.display(form.level)}
        onChange={(e) => setForm((f) => ({ ...f, level: levels.toEnglish(e.target.value) }))} style={{ minWidth: 0 }} />
      <Input id="s-program" label={t("Program")} icon="graduation-cap" placeholder={t("Computer Engineering")} required value={form.program} onChange={set("program")} style={{ minWidth: 0 }} />
      <Select id="s-uni" label={t("First choice university")} required options={universities.map((u) => u.name)} value={form.university} onChange={set("university")} style={{ minWidth: 0 }} />
      <Select id="s-intake" label={t("Intake")} options={intakes.options} value={intakes.display(form.intake)}
        onChange={(e) => setForm((f) => ({ ...f, intake: intakes.toEnglish(e.target.value) }))} style={{ gridColumn: "span 2", minWidth: 0 }} />
      <div style={{ gridColumn: "span 2", minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <label htmlFor="s-notes" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{t("Notes for the admissions team")}</label>
        <textarea id="s-notes" rows={3} value={form.notes} onChange={set("notes")} placeholder={t("Grades, language level, budget, anything that helps us shortlist.")}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--white)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)", resize: "vertical" }} />
        <Checkbox id="s-consent" label={t("The student agreed to be contacted by Campus Turkey")}
          description={t("We contact them on WhatsApp first, and you stay copied on every update.")} checked={form.consent} onChange={set("consent")} />
        {error ? <FormError message={error} /> : null}
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Button variant="primary" size="lg" type="submit">{t("Add to my pipeline")}</Button>
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ withdraw */

const KIND_ICON: Record<PayoutMethod["kind"], string> = {
  bank: "landmark", wise: "globe", stablecoin: "wallet", "mobile-money": "smartphone",
};

function WithdrawForm({
  wallet, onWithdraw, onClose,
}: {
  wallet: typeof content.wallet & { availableMinor: number; methods: PayoutMethod[] };
  onWithdraw: (minor: number, m: PayoutMethod) => Promise<string | null>;
  onClose: () => void;
}) {
  const t = useT();
  const first = wallet.methods[0];
  const [methodId, setMethodId] = useState(first?.id ?? "");
  const [amount, setAmount] = useState((wallet.availableMinor / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const picked = wallet.methods.find((m) => m.id === methodId) ?? first;
  const amountMinor = Math.round((parseFloat(amount) || 0) * 100);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    if (amountMinor < wallet.minimumMinor) { setError(t("The minimum withdrawal is {amount}.", { amount: money(wallet.minimumMinor) })); return; }
    /* A courtesy to the reader, not a control: the server re-checks the balance inside
       the transaction that creates the withdrawal. */
    if (amountMinor > wallet.availableMinor) { setError(t("You have {amount} available right now.", { amount: money(wallet.availableMinor) })); return; }
    setBusy(true);
    const failure = await onWithdraw(amountMinor, picked);
    setBusy(false);
    if (failure) { setError(failure); return; }
    onClose();
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="ct-eyebrow">{t("Available now")}</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h1)", lineHeight: 1, color: "var(--green-700)" }}>{money(wallet.availableMinor)}</span>
        <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{t("{amount} is still clearing and cannot be withdrawn yet.", { amount: money(wallet.pendingMinor) })}</span>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <span className="ct-eyebrow">{t("Where it goes")}</span>
        {wallet.methods.map((m) => {
          const on = methodId === m.id;
          return (
            <button key={m.id} type="button" onClick={() => { setMethodId(m.id); setError(null); }} style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)", textAlign: "start", cursor: "pointer",
              padding: "var(--space-5) var(--space-6)", borderRadius: "var(--radius-md)", background: on ? "var(--green-050)" : "var(--white)",
              border: on ? "1px solid var(--border-brand)" : "1px solid var(--border-subtle)",
              transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
            }}>
              <Icon name={KIND_ICON[m.kind]} size={20} color={on ? "var(--green-600)" : "var(--neutral-500)"} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{m.label}</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.maskedDetail}</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.speed} · {m.fee}</span>
              </span>
              {on ? <Icon name="check" size={18} strokeWidth={2.5} color="var(--green-500)" /> : null}
            </button>
          );
        })}
      </div>

      <Input id="w-amount" label={t("Amount to withdraw")} type="number" icon="banknote" value={amount} required
        min={wallet.minimumMinor / 100} max={wallet.availableMinor / 100} step="0.01" inputMode="decimal"
        onChange={(e) => { setAmount(e.target.value); setError(null); }}
        hint={`${t("Minimum {amount}.", { amount: money(wallet.minimumMinor) })}${picked ? ` ${t("{speed} once approved.", { speed: picked.speed })}` : ""}`} />
      <Button variant="ghost" icon="arrow-up" onClick={() => setAmount((wallet.availableMinor / 100).toFixed(2))} style={{ alignSelf: "flex-start" }}>{t("Withdraw everything available")}</Button>

      {error ? <FormError message={error} /> : null}

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="primary" size="lg" type="submit" disabled={busy}>{busy ? t("Requesting…") : t("Withdraw {amount}", { amount: money(amountMinor) })}</Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t("Cancel")}</Button>
      </div>
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
        {t("Withdrawals are reviewed the same working day. You get a WhatsApp message when the money leaves our account.")}
      </p>
    </form>
  );
}

/* -------------------------------------------------------- add payout method */

const railKind = (id: string): PayoutMethod["kind"] =>
  id === "wise" ? "wise" : id === "stablecoin" ? "stablecoin" : id === "momo" ? "mobile-money" : "bank";

const maskTail = (v: string) => {
  const t = v.replace(/\s+/g, "");
  return t.length <= 4 ? "••••" : `•••• ${t.slice(-4)}`;
};

function AddPayoutMethodForm({ onAdd, onClose }: { onAdd: (m: PayoutMethod, d: boolean) => void; onClose: () => void }) {
  const t = useT();
  const [railId, setRailId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rail = content.wallet.options.find((r) => r.id === railId);

  if (!rail) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {content.wallet.options.map((r) => (
          <button key={r.id} type="button" className="ct-rail" onClick={() => { setRailId(r.id); setError(null); }} style={{
            display: "flex", alignItems: "flex-start", gap: "var(--space-4)", textAlign: "start", cursor: "pointer",
            padding: "var(--space-5) var(--space-6)", borderRadius: "var(--radius-md)", background: "var(--white)",
            border: "1px solid var(--border-subtle)",
            transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, flex: "none", borderRadius: "var(--radius-sm)", background: "var(--green-050)" }}>
              <Icon name={r.icon} size={19} color="var(--green-600)" />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{r.label}</span>
              <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{r.blurb}</span>
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{r.regions} · {r.eta} · {r.fee}</span>
            </span>
            <Icon name="chevron-right" size={18} color="var(--neutral-400)" />
          </button>
        ))}
        <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
          {t("Every method is verified with a small test payment before your first withdrawal.")}
        </p>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const missing = rail.fields.filter((f) => !(values[f.label] ?? "").trim());
    if (missing.length) { setError(t("Fill in {fields} before you save.", { fields: missing.map((f) => f.label.toLowerCase()).join(", ") })); return; }
    /* Only the last four characters survive into the stored method. In production the
       whole form belongs in the provider's hosted fields — see payouts.ts. */
    onAdd({
      id: `${rail.id}-${Date.now()}`, kind: railKind(rail.id), label: rail.label,
      maskedDetail: maskTail((values[rail.fields[0]!.label] ?? "").trim()),
      speed: rail.eta, fee: rail.fee,
    }, makeDefault);
    onClose();
    toast(t("{method} was added to your payout methods.", { method: rail.label }));
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <Button variant="ghost" icon="arrow-left" onClick={() => { setRailId(null); setError(null); }} style={{ alignSelf: "flex-start" }}>{t("All methods")}</Button>
      <Card surface="tinted" padding="var(--space-6)" style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
        <Icon name={rail.icon} size={20} color="var(--green-600)" />
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{rail.label}</span>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{rail.regions} · {rail.eta} · {rail.fee}</span>
        </span>
      </Card>
      {rail.fields.map((f) => (
        <Input key={f.label} id={`m-${f.label.replace(/\W+/g, "-").toLowerCase()}`} label={f.label} icon={f.icon} placeholder={f.placeholder}
          value={values[f.label] ?? ""} onChange={(e) => { setValues((v) => ({ ...v, [f.label]: e.target.value })); setError(null); }}
          style={{ minWidth: 0 }} />
      ))}
      <Checkbox id="m-default" label={t("Make this my default payout method")}
        description={t("Withdrawals will use it unless you pick another one.")} checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
      {error ? <FormError message={error} /> : null}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="primary" size="lg" type="submit">{t("Save this method")}</Button>
        <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
      </div>
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
        {t("We send a small test payment first. Your details are held by our payment provider, not on this site.")}
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------- views */

function StudentTable({ students, compact }: { students: PortalStudent[]; compact?: boolean }) {
  const t = useT();
  const [stage, setStage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const stages = [...new Set(students.map((s) => s.stage))];
  const rows = students.filter((s) => (!stage || s.stage === stage) &&
    (!query || s.name.toLowerCase().includes(query.toLowerCase()) || s.university.toLowerCase().includes(query.toLowerCase())));

  const th: React.CSSProperties = { textAlign: "start", padding: "0 var(--space-4) var(--space-3) 0", fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--neutral-500)", fontWeight: "var(--fw-medium)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "var(--space-4) var(--space-4) var(--space-4) 0", borderTop: "1px solid var(--border-subtle)", color: "var(--text-body)" };

  return (
    <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{compact ? t("Recent referrals") : t("Every student you referred")}</h2>
        {compact ? null : (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", height: 42, padding: "0 16px", background: "var(--surface-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", minWidth: 240 }}>
            <Icon name="search" size={16} color="var(--neutral-500)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search students")} aria-label={t("Search students")}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)" }} />
          </div>
        )}
      </div>
      {compact ? null : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {stages.map((s) => (
            <Tag key={s} selected={stage === s} onClick={() => setStage(stage === s ? null : s)}
              count={students.filter((x) => x.stage === s).length}>{s}</Tag>
          ))}
        </div>
      )}
      <div className="ct-table-scroll" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)" }}>
          <thead>
            <tr>{[t("Student"), t("Program"), t("University"), t("Stage"), t("Commission")].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td style={td}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{s.name}</span>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{t("Updated {when}", { when: s.updated })}</span>
                  </span>
                </td>
                <td style={td}>{s.program}</td>
                <td style={td}>{s.university}</td>
                <td style={td}><Badge tone={STAGE_TONE[s.stage]}>{s.stage}</Badge></td>
                <td style={{ ...td, fontWeight: "var(--fw-semibold)", color: "var(--green-700)", whiteSpace: "nowrap" }}>
                  {s.commissionMinor > 0 ? money(s.commissionMinor) : t("Pending")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length ? null : <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("No students match that filter.")}</p>}
    </Card>
  );
}

/* ---------------------------------------------------------------- dashboard */

type View = "overview" | "students" | "commissions" | "materials" | "account";

/**
 * Shown while the four dashboard requests are in flight.
 *
 * Deliberately quiet — no skeleton of fake rows. A placeholder shaped like a balance is
 * a number the eye reads before it is told not to.
 */
function PortalLoading() {
  const t = useT();

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-subtle)", color: "var(--text-body)",
        fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)",
      }}
    >
      {t("Loading your portal…")}
    </div>
  );
}

export default function PortalDashboard() {
  const portal = usePortalData();

  if (portal.status === "loading") return <PortalLoading />;
  if (portal.status === "failed") {
    // A stale session is a different problem from an unreachable server, and the
    // designed screens say different things about each — one offers a sign-in, the
    // other offers a retry.
    return <ErrorScreen state={portal.message === "session" ? "sessionExpired" : "failed"} />;
  }

  return <PortalView data={portal.data} onReload={portal.reload} />;
}

/**
 * The dashboard proper, mounted only once the data is in hand.
 *
 * Split from the component above so that every `useState` below can be initialised from
 * real values. Initialising from placeholders and then overwriting them in an effect is
 * how a portal briefly renders somebody else's balance.
 */
function PortalView({ data, onReload }: { data: PortalData; onReload: () => void }) {
  const t = useT();
  const href = useHref();
  const [view, setView] = useState<View>("overview");
  const [sheet, setSheet] = useState<"student" | "withdraw" | "method" | null>(null);
  const [students, setStudents] = useState<PortalStudent[]>(data.students);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(data.withdrawals);
  /* No setter: the balance is the server's to change. `onReload` re-reads it after a
     withdrawal rather than this screen adjusting a copy. */
  const availableMinor = data.wallet.availableMinor;
  const [methods, setMethods] = useState<PayoutMethod[]>(data.wallet.methods);
  const [lang, setLanguage] = useLocaleSwitch();

  const account = data.account;
  const wallet = { ...data.wallet, availableMinor, methods };

  const addMethod = (m: PayoutMethod, makeDefault: boolean) =>
    setMethods((list) => {
      const cleared = makeDefault ? list.map((x) => ({ ...x, isDefault: false })) : list;
      const added = { ...m, isDefault: makeDefault };
      return makeDefault ? [added, ...cleared] : [...cleared, added];
    });

  /**
   * The server is authoritative: this asks, it does not decide.
   *
   * The development fallback that used to live here — invent a withdrawal locally when
   * the request failed — is gone. It existed because there was no server; there is one
   * now, and a UI that fabricates a payout when the API is unreachable is the single
   * most misleading thing this screen could do.
   *
   * On success the balance is re-read from the server rather than decremented locally.
   * The client's arithmetic and the server's would agree today and drift the first time
   * a fee, a minimum or a reversal enters the picture, and the server's is the one that
   * decides what the partner can withdraw next.
   */
  const withdraw = async (amountMinor: number, method: PayoutMethod): Promise<string | null> => {
    const result = await requestWithdrawal({
      amountMinor, currency: CURRENCY, payoutMethodId: method.id, idempotencyKey: newIdempotencyKey(),
    }).catch(() => null);

    if (!result) {
      return t("We could not reach the server. Nothing has been taken from your balance.");
    }
    if (!result.ok) {
      // `reason` distinguishes a stale balance from an invalid method from a limit;
      // the message is already written for a partner to read.
      return result.message;
    }

    setWithdrawals((list) => [result.withdrawal, ...list]);
    toast(t("{amount} is on its way by {method}.", { amount: money(amountMinor), method: method.label.toLowerCase() }));
    onReload();
    return null;
  };

  const kpis = content.kpis.map((k) =>
    k.label === "Students referred" ? { ...k, value: String(students.length + 32) }
      : k.label === "Available to withdraw" ? { ...k, value: money(availableMinor) } : k);

  /*
   * Built here rather than at module scope, and written out as literal `t()` calls.
   * The extractor collects string literals, so a label held in a module constant and
   * translated as `t(label)` would render correctly and never reach the catalogue —
   * which is the failure the unwrapped-string report exists to prevent.
   */
  const nav: [View, string, string][] = [
    ["overview", t("Overview"), "layout-dashboard"],
    ["students", t("My students"), "users"],
    ["commissions", t("Commissions"), "wallet"],
    ["materials", t("Materials"), "receipt"],
    ["account", t("Account"), "user"],
  ];

  const copy: Record<View, [string, string]> = {
    overview: [t("Good morning, {name}", { name: account.person.split(" ")[0] ?? "" }), t("Everything on your territory at a glance.")],
    students: [t("My students"), t("Every referral, its stage and what it will pay.")],
    commissions: [t("Commissions"), t("What you have earned, and how to move it to your account.")],
    materials: [t("Materials"), t("Brochures, price lists and assets in your languages.")],
    account: [t("Account"), t("Your organisation, agreement and notification settings.")],
  };
  const [title, lead] = copy[view];
  const initials = account.person.split(" ").map((w) => w[0]).join("").slice(0, 2);

  const th: React.CSSProperties = { textAlign: "start", padding: "0 var(--space-4) var(--space-3) 0", fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--neutral-500)", fontWeight: "var(--fw-medium)" };
  const td: React.CSSProperties = { padding: "var(--space-4) var(--space-4) var(--space-4) 0", borderTop: "1px solid var(--border-subtle)", color: "var(--text-body)" };

  return (
    <div className="ct-portal" style={{ display: "grid", gridTemplateColumns: "minmax(240px,264px) 1fr", background: "var(--surface-subtle)", minHeight: "100dvh" }}>
      <aside className="ct-portal-aside" style={{ position: "sticky", top: 0, alignSelf: "start", height: "100dvh", display: "flex", flexDirection: "column", gap: "var(--space-8)", padding: "var(--space-8) var(--space-6)", background: "var(--gradient-brand-deep)", boxSizing: "border-box" }}>
        <a href={href("home")} style={{ display: "block" }}><Logo variant="lockup" theme="reversed" height={44} assetBase={ASSETS} /></a>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map(([key, label, icon]) => {
            const on = view === key;
            return (
              <button key={key} type="button" onClick={() => setView(key)} style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)", height: 46, padding: "0 14px",
                borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", textAlign: "start",
                background: on ? "rgba(255,255,255,.14)" : "transparent",
                color: on ? "var(--white)" : "rgba(255,255,255,.72)",
                fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: on ? "var(--fw-semibold)" : "var(--fw-regular)",
                transition: "background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)",
              }}>
                <Icon name={icon} size={18} />{label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <BrandDivider theme="dark" />
          <div data-ct-no-translate style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>{t("Language")}</span>
            <LanguageSwitcher value={lang} onChange={setLanguage} theme="onDark" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--white)" }}>{account.manager}</span>
            <span style={{ fontSize: "var(--fs-caption)", color: "rgba(255,255,255,.66)" }}>{account.managerRole}</span>
          </div>
          <Button variant="outlineOnDark" icon="log-out" onClick={() => go("portal")}>{t("Sign out")}</Button>
        </div>
      </aside>

      <main style={{ padding: "var(--space-10) var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--space-8)", minWidth: 0 }}>
        <header style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span className="ct-eyebrow">{account.org} · {account.territory}</span>
            <h1 style={{ fontSize: "var(--fs-h1)", margin: 0 }}>{title}</h1>
            <p style={{ color: "var(--text-body)", margin: 0, maxWidth: 560 }}>{lead}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <Button variant="secondary" icon="plus" onClick={() => setSheet("student")}>{t("Add a student")}</Button>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: "var(--radius-circle)", background: "var(--green-050)", color: "var(--green-700)", fontFamily: "var(--font-ui)", fontWeight: "var(--fw-semibold)" }}>{initials}</span>
          </div>
        </header>

        {view === "overview" ? (
          <>
            <CardGrid min={200} gap="var(--space-5)">
              {kpis.map((k) => (
                <Card key={k.label} padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="ct-eyebrow">{k.label}</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h1)", lineHeight: 1, color: "var(--green-700)" }}>{k.value}</span>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{k.description}</span>
                </Card>
              ))}
            </CardGrid>

            <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "var(--space-6)", alignItems: "start" }}>
              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-4)", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{t("Where your students are")}</h2>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{t("Updated this morning")}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${content.pipeline.length},1fr)`, gap: "var(--space-4)", alignItems: "end", minHeight: 168 }}>
                  {content.pipeline.map((p) => {
                    const max = Math.max(...content.pipeline.map((x) => x.count));
                    return (
                      <div key={p.stage} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{p.count}</span>
                        <span style={{ width: "100%", height: Math.max(8, (p.count / max) * 120), borderRadius: "var(--radius-xs)", background: p.stage === "Registered" ? "var(--action-primary)" : "var(--green-200)" }} />
                        <span style={{ fontSize: "var(--fs-micro)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--neutral-500)", textAlign: "center" }}>{p.stage}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{t("Needs you this week")}</h2>
                {content.actions.map((a, i) => (
                  <div key={a.title} style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start", paddingTop: i ? "var(--space-5)" : 0, borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, flex: "none", borderRadius: "var(--radius-sm)", background: "var(--green-050)" }}>
                      <Icon name={a.icon} size={18} color="var(--green-600)" />
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{a.title}</span>
                      <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{a.body}</span>
                    </div>
                    <Button variant="ghost" icon="arrow-right" onClick={() => toast(t("Not wired yet: {action}.", { action: a.cta.toLowerCase() }))}>{a.cta}</Button>
                  </div>
                ))}
              </Card>
            </div>

            <StudentTable students={students.slice(0, 4)} compact />
          </>
        ) : null}

        {view === "students" ? <StudentTable students={students} /> : null}

        {view === "commissions" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "var(--space-6)", alignItems: "stretch" }}>
              <Card surface="inverse" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                <span className="ct-eyebrow" style={{ color: "var(--green-300)" }}>{t("Available to withdraw")}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-display-2)", lineHeight: 1, color: "var(--white)" }}>{money(availableMinor)}</span>
                <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
                  {([[t("Clearing"), wallet.pendingMinor], [t("Lifetime earned"), wallet.lifetimeMinor]] as const).map(([k, v]) => (
                    <span key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>{k}</span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-lead)", color: "var(--white)" }}>{money(v)}</span>
                    </span>
                  ))}
                </div>
                <Button variant="onDark" size="lg" icon="banknote" onClick={() => setSheet("withdraw")} style={{ alignSelf: "flex-start" }}>{t("Withdraw funds")}</Button>
                <p style={{ fontSize: "var(--fs-caption)", color: "rgba(255,255,255,.72)", margin: 0, maxWidth: 420 }}>{wallet.note}</p>
              </Card>

              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{t("Your payout methods")}</h2>
                {methods.map((m, i) => (
                  <div key={m.id} style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start", paddingTop: i ? "var(--space-5)" : 0, borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                    <Icon name={KIND_ICON[m.kind]} size={19} color="var(--green-600)" />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{m.label}</span>
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.maskedDetail}</span>
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.speed} · {m.fee}</span>
                    </span>
                    {m.isDefault ? <Badge tone="brand">{t("Default")}</Badge> : null}
                  </div>
                ))}
                <Button variant="secondary" icon="plus" onClick={() => setSheet("method")} style={{ alignSelf: "flex-start" }}>{t("Add a method")}</Button>
              </Card>
            </div>

            <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{t("Payment history")}</h2>
              <div className="ct-table-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)" }}>
                  <thead>
                    <tr>{[t("Reference"), t("Period"), t("Basis"), t("Amount"), t("Status")].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td style={td}>{w.reference}</td>
                        <td style={td}>{w.period}</td>
                        <td style={td}>{w.basis}</td>
                        <td style={{ ...td, color: "var(--green-700)", fontWeight: "var(--fw-semibold)" }}>{money(w.amountMinor)}</td>
                        <td style={td}><Badge tone={w.status === "Paid" ? "brand" : "neutral"}>{w.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
                {t("Commission is credited within 30 days of the university confirming registration. Rates are set in your agreement.")}
              </p>
            </Card>
          </div>
        ) : null}

        {view === "materials" ? (
          <CardGrid min={260} gap="var(--space-5)">
            {content.materials.map((m) => (
              <Card key={m.title} interactive padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <Icon name={m.icon} size={20} color="var(--green-600)" />
                <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{m.title}</h3>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.meta}</span>
                <Button variant="ghost" icon="download" onClick={() => toast(t("Not wired yet: the download would start here."))}>{t("Download")}</Button>
              </Card>
            ))}
          </CardGrid>
        ) : null}

        {view === "account" ? (
          <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px,340px)", gap: "var(--space-8)", alignItems: "start" }}>
            <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{t("Organisation details")}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                <Input id="a-org" label={t("Organisation name")} icon="building" defaultValue={account.org} />
                <Input id="a-person" label={t("Contact person")} icon="user" defaultValue={account.person} />
                <Input id="a-email" label={t("Work email")} type="email" icon="mail" defaultValue="samuel@brightfutures.ng" />
                <Input id="a-phone" label={t("WhatsApp number")} icon="phone" defaultValue="+234 800 000 0000" />
                {/* Autonyms, deliberately untranslated: a language is named in its own
                    language in every locale's list, which is how a reader finds theirs. */}
                <Select id="a-lang" label={t("Preferred language")} options={["English", "Français", "العربية"]} />
                <Input id="a-territory" label={t("Territory")} icon="globe" defaultValue={account.territory} disabled />
                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  <Checkbox id="a-notify" label={t("Email me when a student changes stage")} checked onChange={() => {}} />
                  <Button variant="primary" onClick={() => toast(t("Not wired yet: your details would be saved."))} style={{ alignSelf: "flex-start" }}>{t("Save changes")}</Button>
                </div>
              </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <span className="ct-eyebrow">{t("Agreement")}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{account.role}</span>
                <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{t("{since}. Exclusive territory: {territory}.", { since: account.since, territory: account.territory })}</span>
                <Button variant="secondary" icon="file-text" onClick={() => toast(t("Not wired yet: the agreement PDF would open."))}>{t("Read agreement")}</Button>
              </Card>
              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <span className="ct-eyebrow">{t("Need help")}</span>
                <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{t("{manager} answers you directly, not a shared inbox.", { manager: account.manager })}</span>
                <Button variant="secondary" icon="message-circle" onClick={() => go("contact")}>{t("Message your contact")}</Button>
              </Card>
            </div>
          </div>
        ) : null}

        <Button variant="ghost" icon="arrow-left" onClick={() => go("home")} style={{ alignSelf: "flex-start" }}>{t("Back to the website")}</Button>
      </main>

      <PortalSheet open={sheet === "student"} onClose={() => setSheet(null)}
        title={t("Add a student")} lead={t("One short form. We take it from here and you see every stage in your pipeline.")}>
        <AddStudentForm onAdd={(s) => setStudents((l) => [s, ...l])} onClose={() => setSheet(null)} />
      </PortalSheet>

      <PortalSheet open={sheet === "withdraw"} onClose={() => setSheet(null)}
        title={t("Withdraw funds")} lead={t("Move cleared commission to your own account.")}>
        <WithdrawForm wallet={wallet} onWithdraw={withdraw} onClose={() => setSheet(null)} />
      </PortalSheet>

      <PortalSheet open={sheet === "method"} onClose={() => setSheet(null)}
        title={t("Add a payout method")} lead={t("Pick the rail that reaches you fastest and costs you least.")}>
        <AddPayoutMethodForm onAdd={addMethod} onClose={() => setSheet(null)} />
      </PortalSheet>
    </div>
  );
}
