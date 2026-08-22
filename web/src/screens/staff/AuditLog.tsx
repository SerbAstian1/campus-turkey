"use client";

/**
 * The audit log — brief §48.
 *
 * **What makes this different from the four queues beside it.** A queue is a list of work
 * waiting on a decision; every row is a question. This is the answer file. Nothing here
 * can be acted on, and that is the point — the table is append-only in the database, so an
 * interface offering a button to change a row would be describing a power that does not
 * exist.
 *
 * So the screen is built for one job: settling a question about something that already
 * happened. That shapes three choices.
 *
 * *Entries read as sentences, not fields.* `commission.transitioned` carrying
 * `{from:"PENDING",to:"CONFIRMED"}` renders as "Commission updated · Pending →
 * Confirmed", because the reader is reconstructing events and a grid of enum values makes
 * them do the translating. Unknown actions degrade to a humanised form of the action
 * string rather than being hidden — a viewer that silently drops what it does not
 * recognise is worse than useless in an incident, since the missing row is the one being
 * looked for.
 *
 * *The actor's role sits next to their name.* "Deniz approved this" and "an admin
 * approved this" answer different questions, and the second is usually the one asked.
 *
 * *It pages instead of truncating.* The other queues load fifty rows and stop, which is
 * right for bounded work. A log only grows, and the entry that settles the argument is
 * frequently older than the newest fifty.
 *
 * **On emptiness.** This table held nothing until the decisions above it were made
 * recordable, and it will read sparse for a while yet: withdrawals keep their own
 * `withdrawalEvent` history, and several staff actions still write only to the log
 * stream. The empty copy names which actions are recorded rather than implying that
 * nothing has ever happened at Campus Turkey.
 */

import { useState } from "react";
import { Button, Card, Icon } from "@/ds";
import { useAuditLog, when, money, type AuditEvent } from "@/features/staff/data";
import { QueueState } from "./shared";

/**
 * The entity types that can currently appear, and what to call them.
 *
 * Derived from the `recordAudit` call sites rather than from the database, because an
 * entity type only exists here once something writes one. A filter that always returns
 * nothing teaches the reader to distrust the filters.
 */
const SCOPES: { key: string; label: string }[] = [
  { key: "application", label: "Applications" },
  { key: "representative_application", label: "Representatives" },
  { key: "commission", label: "Commissions" },
];

/** Actions worth a sentence. Anything absent falls back to `humanise`. */
const SENTENCE: Record<string, string> = {
  "application.status_changed": "Application status changed",
  "representative_application.approved": "Representative approved",
  "representative_application.rejected": "Representative rejected",
  "commission.transitioned": "Commission updated",
};

/** Status enums as English. Shared vocabulary with the queues' status pills. */
const STATE_WORD: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  REVERSED: "Reversed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  UNDER_REVIEW: "Under review",
  SUBMITTED: "Submitted",
  DRAFT: "Draft",
  ACCEPTED: "Accepted",
  ENROLLED: "Enrolled",
  WITHDRAWN: "Withdrawn",
};

const word = (value: unknown) =>
  typeof value === "string" ? (STATE_WORD[value] ?? value) : String(value);

/**
 * `commission.transitioned` becomes "Commission transitioned".
 *
 * The fallback for an action added after this file was written. It keeps the row legible
 * without pretending to know what the action means.
 */
function humanise(action: string): string {
  const text = action.replace(/[._]/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The one-line detail under the heading, built from metadata.
 *
 * Returns null rather than an empty string when there is nothing to say, so the row
 * collapses instead of leaving a gap where detail is expected.
 */
function detail(event: AuditEvent): string | null {
  const meta = event.metadata ?? {};
  const parts: string[] = [];

  if (typeof meta.from === "string" || typeof meta.to === "string") {
    parts.push(`${meta.from ? word(meta.from) : "New"} to ${word(meta.to)}`);
  }

  // Formatted only when the currency travelled with the amount. Minor units alone are
  // not a sum of money and guessing the denomination would misreport one.
  if (typeof meta.amountMinor === "number" && typeof meta.currency === "string") {
    parts.push(money(meta.amountMinor, meta.currency));
  }

  if (typeof meta.territory === "string") parts.push(meta.territory);

  // The note is the reviewer's own words and is usually the whole reason the entry is
  // being read, so it goes last and is not truncated.
  if (typeof meta.note === "string" && meta.note.trim()) parts.push(`"${meta.note.trim()}"`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function AuditLog() {
  const [scope, setScope] = useState<string | null>(null);
  const { state, more, loadingMore } = useAuditLog(scope ? { entityType: scope } : {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div role="group" aria-label="Filter by record" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        {[{ key: "", label: "Everything" }, ...SCOPES].map((option) => {
          const active = (option.key || null) === scope;
          return (
            <button
              key={option.key || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setScope(option.key || null)}
              style={{
                minHeight: 44,
                padding: "0 var(--space-4)",
                borderRadius: "var(--radius-pill)",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-body-sm)",
                fontWeight: active ? "var(--fw-semibold)" : "var(--fw-regular)",
                background: active ? "var(--green-050)" : "var(--white)",
                border: `1px solid ${active ? "var(--green-600)" : "var(--border-subtle)"}`,
                color: active ? "var(--green-800)" : "var(--text-body)",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <QueueState
        feed={state}
        empty={
          scope
            ? "Nothing recorded against these records yet."
            : "Nothing recorded yet. Application status changes, representative decisions and commission updates are written here as they happen."
        }
      />

      {state.status === "ready" && state.items.length > 0 ? (
        <>
          <Card padding="0" radius="var(--radius-lg)" style={{ overflow: "hidden" }}>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {state.items.map((event, index) => (
                <Entry key={event.id} event={event} first={index === 0} />
              ))}
            </ol>
          </Card>

          {more ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button variant="secondary" disabled={loadingMore} onClick={more}>
                {loadingMore ? "Loading…" : "Load older entries"}
              </Button>
            </div>
          ) : (
            <p style={{ margin: 0, textAlign: "center", color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>
              That is the whole record.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

function Entry({ event, first }: { event: AuditEvent; first: boolean }) {
  const line = detail(event);
  const actor = event.actor;

  return (
    <li
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "var(--space-4) var(--space-5)",
        // Rules between rather than around: a log is read as a continuous column, and
        // boxing each entry would break it into unrelated cards.
        borderTop: first ? "none" : "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontWeight: "var(--fw-semibold)", color: "var(--text-heading)", fontSize: "var(--fs-body-sm)" }}>
          {SENTENCE[event.action] ?? humanise(event.action)}
        </span>
        <time
          dateTime={event.createdAt}
          style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", whiteSpace: "nowrap" }}
        >
          {when(event.createdAt)}
        </time>
      </div>

      {line ? (
        <span style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)", overflowWrap: "anywhere" }}>
          {line}
        </span>
      ) : null}

      <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)", color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>
        <Icon name="user" size={14} />
        {actor ? (
          <>
            {actor.name ?? actor.email}
            <span aria-hidden="true">·</span>
            {actor.role}
          </>
        ) : (
          // A null actor is the system acting, not a missing name — a retention job or a
          // scheduled transition has no user behind it, and "Unknown" would imply the
          // record is damaged.
          "Automatic"
        )}
        {event.entityId ? (
          <>
            <span aria-hidden="true">·</span>
            <code style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "var(--fs-micro)" }}>
              {event.entityId.slice(0, 8)}
            </code>
          </>
        ) : null}
      </span>
    </li>
  );
}
