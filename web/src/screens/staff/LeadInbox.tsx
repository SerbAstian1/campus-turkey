"use client";

/**
 * The enquiry inbox.
 *
 * Every public form lands here. Two decisions shape this screen and both are about the
 * medical queue rather than about layout:
 *
 *   1. **Medical is a separate filter, never part of "All".** Those enquiries carry
 *      health information, and the API withholds their payload unless that queue is
 *      asked for by name. So the interface has to make asking a deliberate act rather
 *      than something that happens by scrolling.
 *   2. **The retention date is shown on every row.** It is the promise made to the
 *      person who filled the form in, and a promise nobody can see is one that quietly
 *      stops being kept. Medical enquiries hold 90 days against 730 for everything else,
 *      and the row says which.
 */

import { useState } from "react";
import { Button, Card, Icon, Input, Select } from "@/ds";
import { act, useLeadInbox, when, type LeadType, type QueueLead } from "@/features/staff/data";
import { Filters, QueueState, StatusDot } from "./shared";

/**
 * One filter per desk. The order is the order the desks are staffed in, not the order
 * the enum happens to declare — Applications and Contact carry the volume, the four
 * service queues are worked by the people who own those services, and Medical is last
 * because reaching it should take a deliberate scroll past everything else.
 */
const KINDS: { key: string; label: string }[] = [
  { key: "STUDY", label: "Applications" },
  { key: "CONTACT", label: "Contact" },
  { key: "PARTNER", label: "Partner" },
  { key: "REPRESENTATIVE", label: "Representative" },
  { key: "BUSINESS", label: "Business" },
  { key: "EMPLOYMENT", label: "Employment" },
  { key: "TOURS", label: "Tours" },
  { key: "MEDICAL", label: "Medical" },
];

const KIND_LABEL: Record<LeadType, string> = {
  STUDY: "Application",
  CONTACT: "Contact",
  PARTNER: "Partner registration",
  REPRESENTATIVE: "Representative",
  BUSINESS: "Business facilitation",
  EMPLOYMENT: "Employment",
  TOURS: "Tours",
  MEDICAL: "Medical",
};

export function LeadInbox({ canApprove }: { canApprove: boolean }) {
  const [filter, setFilter] = useState<LeadType | null>(null);
  const inbox = useLeadInbox(filter ?? undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <Filters options={KINDS} value={filter} onChange={(key) => setFilter((key as LeadType) ?? null)} />

      {filter === "MEDICAL" ? (
        <p
          role="note"
          style={{
            display: "flex",
            gap: "var(--space-3)",
            alignItems: "flex-start",
            margin: 0,
            padding: "var(--space-4)",
            borderRadius: "var(--radius-sm)",
            background: "var(--green-050)",
            border: "1px solid var(--green-100)",
            color: "var(--text-body)",
            fontSize: "var(--fs-body-sm)",
            maxWidth: "68ch",
          }}
        >
          <Icon name="shield" size={18} color="var(--green-600)" />
          <span>
            These enquiries contain health information. Opening this queue is recorded. They are
            deleted 90 days after consent. The date is on each row.
          </span>
        </p>
      ) : null}

      <QueueState
        feed={inbox}
        empty={
          filter
            ? "Nothing in this queue."
            : "No enquiries yet. Everything the public forms send arrives here."
        }
      />

      {inbox.status === "ready"
        ? inbox.items.map((lead) => (
            <LeadRow key={lead.id} lead={lead} canApprove={canApprove} onDone={inbox.reload} />
          ))
        : null}
    </div>
  );
}

function LeadRow({
  lead,
  canApprove,
  onDone,
}: {
  lead: QueueLead;
  canApprove: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);

  const latest = lead.latest;
  const withheld = latest ? "withheld" in latest.payload : false;
  const name = lead.name ?? lead.email;

  /**
   * The newest message's date, not the lead's. The lead's is the latest of all of them,
   * and showing that beside a medical enquiry would say "deleted in 700 days" about
   * something being deleted in 90 — the exact promise this row exists to display.
   */
  const daysLeft = Math.ceil(
    (new Date(latest?.retentionUntil ?? lead.retentionUntil).getTime() - Date.now()) / 86_400_000,
  );

  return (
    <Card padding="var(--space-6)" radius="var(--radius-lg)" elevation="sm">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-5)", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ color: "var(--text-heading)", fontSize: "var(--fs-body)", fontWeight: "var(--fw-medium)" }}>
            {name}
          </div>
          <div style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", wordBreak: "break-word" }}>
            {lead.email}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", marginTop: 2 }}>
            {KIND_LABEL[latest?.type ?? lead.kind]} · {when(latest?.createdAt ?? lead.createdAt)}
            {/* Somebody who has written in before is somebody to greet differently, so
                the count is on the row rather than behind a click. */}
            {lead.inquiryCount > 1 ? ` · ${lead.inquiryCount} enquiries` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusDot status={lead.status} />
          <span
            style={{
              color: daysLeft <= 14 ? "var(--status-danger)" : "var(--text-muted)",
              fontSize: "var(--fs-caption)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {daysLeft > 0 ? `Deleted in ${daysLeft}d` : "Due for deletion"}
          </span>
        </div>
      </div>

      {withheld || !latest ? (
        <p style={{ margin: "var(--space-4) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
          {latest
            ? "Held in the medical queue. Open that filter to read it."
            : "Every enquiry from this person has passed its retention date and been deleted."}
        </p>
      ) : (
        <>
          {/* The message itself, above the fold. It is what the row is for, and putting
              it behind the same click as the structured fields made the desk open every
              row to find out whether it needed opening. */}
          {latest.message ? (
            <p
              style={{
                margin: "var(--space-4) 0 0",
                color: "var(--text-body)",
                fontSize: "var(--fs-body-sm)",
                lineHeight: "var(--lh-body)",
                maxWidth: "68ch",
                whiteSpace: "pre-wrap",
              }}
            >
              {latest.message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            style={{
              display: "flex", alignItems: "center", gap: 6, minHeight: 44,
              marginTop: "var(--space-3)", padding: 0, background: "transparent",
              border: "none", cursor: "pointer", color: "var(--text-link)",
              fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)",
            }}
          >
            <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
            {open ? "Hide details" : "Show details"}
          </button>

          {open ? <Payload payload={latest.payload} /> : null}
        </>
      )}

      <Progress lead={lead} onDone={onDone} />

      {latest?.type === "PARTNER" && canApprove ? (
        <ApprovePartner lead={lead} onDone={onDone} />
      ) : null}
    </Card>
  );
}

/**
 * Recording that somebody dealt with the enquiry.
 *
 * The inbox has had a status column since it was built and no way to change it, so every
 * enquiry sat at NEW for ever and the desk could not tell yesterday's unanswered messages
 * from last month's finished ones. Two buttons, because two is the number of states a
 * desk actually needs: someone is on it, or it is done.
 *
 * A converted lead shows neither. It has an account now, and the account is where the
 * work continues — the endpoint refuses the change for the same reason.
 */
function Progress({ lead, onDone }: { lead: QueueLead; onDone: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (lead.status === "CONVERTED") return null;

  const move = async (status: "CONTACTED" | "CLOSED" | "NEW") => {
    setPending(status);
    setError(null);
    const result = await act(`/api/staff/leads/${lead.id}`, { status });
    setPending(null);
    if (result.ok) onDone();
    else setError(result.message);
  };

  const options: { status: "CONTACTED" | "CLOSED" | "NEW"; label: string }[] =
    lead.status === "CLOSED"
      ? [{ status: "NEW", label: "Reopen" }]
      : [
          ...(lead.status === "NEW"
            ? [{ status: "CONTACTED" as const, label: "Mark contacted" }]
            : []),
          { status: "CLOSED" as const, label: "Close" },
        ];

  return (
    <div style={{ marginTop: "var(--space-4)", display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
      {options.map((option) => (
        <Button
          key={option.status}
          variant="secondary"
          onClick={() => void move(option.status)}
          disabled={pending !== null}
        >
          {pending === option.status ? "Saving…" : option.label}
        </Button>
      ))}

      {error ? (
        <span role="alert" style={{ color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Turning an application into an account.
 *
 * The four fields here are the ones an application cannot supply, and they are asked for
 * rather than defaulted because each has a consequence that outlives this click:
 *
 *   **Currency** is on the composite foreign key joining a partner to their commissions
 *   and withdrawals. Guessing it wrong does not produce a wrong number later — it
 *   produces a partner who can never be paid a commission, because every insert is
 *   refused by the database. It cannot be changed afterwards without rewriting every row
 *   that references it, so it is a select with no default.
 *
 *   **Named manager** is a promise the portal makes out loud ("your named contact will
 *   call"). Recorded here or it is not true.
 *
 * No password is set and none is sent. The partner receives a link, chooses their own,
 * and confirms a code — so nobody at Campus Turkey ever knows a partner's password, and
 * there is no credential sitting in a chat log waiting to be found.
 */
function ApprovePartner({ lead, onDone }: { lead: QueueLead; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    role: "Director",
    managerName: "",
    managerRole: "Partnerships Manager",
    currency: "USD",
    territory: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const converted = lead.status === "CONVERTED";

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const approve = async () => {
    setPending(true);
    setError(null);

    const result = await act(`/api/staff/leads/${lead.id}/approve`, {
      role: form.role.trim(),
      managerName: form.managerName.trim(),
      managerRole: form.managerRole.trim(),
      currency: form.currency,
      ...(form.territory.trim() ? { territory: form.territory.trim() } : {}),
    });

    setPending(false);
    if (result.ok) {
      setDone("Account created. The partner has been emailed a link to set their password.");
      onDone();
      return;
    }
    setError(result.message);
  };

  if (converted) {
    return (
      <p style={{ margin: "var(--space-4) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
        Approved. This applicant has a partner account.
      </p>
    );
  }

  if (done) {
    return (
      <p style={{ margin: "var(--space-4) 0 0", color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
        {done}
      </p>
    );
  }

  return (
    <div style={{ marginTop: "var(--space-5)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border-subtle)" }}>
      {!open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button variant="primary" size="md" type="button" onClick={() => setOpen(true)}>
            Approve and create account
          </Button>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", maxWidth: "40ch" }}>
            Creates their login and emails them a link to set a password. No money moves.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input id={`role-${lead.id}`} label="Their role"
            hint="Their job title at the agency."
            value={form.role} onChange={set("role")} />
          <Input id={`mgr-${lead.id}`} label="Their named contact at Campus Turkey"
            hint="The person who will call them. The portal shows this name."
            placeholder="Elif Demir"
            value={form.managerName} onChange={set("managerName")} />
          <Input id={`mgrrole-${lead.id}`} label="That contact's role"
            value={form.managerRole} onChange={set("managerRole")} />
          <Select id={`cur-${lead.id}`} label="Payout currency"
            hint="Cannot be changed later. Commissions and withdrawals are keyed to it."
            options={["USD", "EUR", "GBP", "TRY", "NGN"]}
            value={form.currency} onChange={set("currency")} />
          <Input id={`terr-${lead.id}`} label="Territory (optional)"
            hint="Taken from the application if left blank."
            value={form.territory} onChange={set("territory")} />

          {error ? (
            <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
              <Icon name="alert-circle" size={16} />
              {error}
            </span>
          ) : null}

          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Button variant="primary" size="md" type="button"
              disabled={pending || form.managerName.trim() === ""}
              onClick={() => void approve()}>
              {pending ? "Creating…" : "Create the account"}
            </Button>
            <Button variant="secondary" size="md" type="button" disabled={pending}
              onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The submitted fields.
 *
 * A definition list rather than JSON: this is read by an admissions officer, not a
 * developer. Keys are de-camelCased on the way out so `universitySlug` reads as
 * "University slug" without needing a per-kind label map that would drift from the
 * schemas.
 */
function Payload({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).filter(([, value]) => value !== null && value !== "");

  if (entries.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>Nothing else was submitted.</p>;
  }

  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px,auto) 1fr",
        gap: "var(--space-2) var(--space-5)",
        margin: "var(--space-3) 0 0",
        padding: "var(--space-4)",
        background: "var(--surface-subtle)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--fs-body-sm)",
      }}
    >
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: "contents" }}>
          <dt style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
          </dt>
          <dd style={{ margin: 0, color: "var(--text-heading)", wordBreak: "break-word" }}>
            {String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
