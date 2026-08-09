"use client";

/**
 * The payout queue.
 *
 * **Decision-Point Clarity is the dimension this screen lives or dies on.** A reviewer
 * approving a payment needs the amount, who is being paid, by what method, on what
 * basis, and what has already happened to the request — *before* committing, without
 * navigating away and losing their place. So the row carries all of it, and the row
 * expands in place rather than opening a detail page.
 *
 * Rejection asks for a reason before the button is live. That is not friction for its
 * own sake: the reason is the only thing the partner will be told, and the API refuses
 * the transition without one anyway. Asking here turns a server-side 409 into a filled
 * -in field.
 *
 * The amount is the largest thing in the row on purpose — squint at this screen and the
 * numbers are what survive, which is correct for a page whose whole job is deciding
 * about money.
 */

import { useState } from "react";
import { Button, Card, Icon, Input } from "@/ds";
import {
  act, money, waiting, when,
  useWithdrawalQueue, type QueueWithdrawal, type WithdrawalStatus,
} from "@/features/staff/data";
import { QueueState, StatusDot } from "./shared";

/** Which statuses a reviewer can move a request to, by where it is now. Mirrors the
 *  server's state machine — the server is authoritative, this only avoids offering a
 *  button that will be refused. */
const NEXT: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSING", "REJECTED"],
  PROCESSING: ["PAID", "REJECTED"],
  PAID: [],
  REJECTED: [],
};

const ACTION_LABEL: Record<WithdrawalStatus, string> = {
  APPROVED: "Approve",
  PROCESSING: "Send to provider",
  PAID: "Mark paid",
  REJECTED: "Reject",
  REQUESTED: "Reopen",
};

/** What actually happens, in the reviewer's terms. Shown beside the button, because
 *  "Approve" alone does not say whether money moves now or later. */
const ACTION_CONSEQUENCE: Partial<Record<WithdrawalStatus, string>> = {
  APPROVED: "Queues it for payment. Money does not move yet.",
  PROCESSING: "Hands it to the payout provider. Money moves.",
  PAID: "Records that it settled.",
  REJECTED: "Returns the amount to the partner's balance.",
};

export function WithdrawalQueue({ canAct }: { canAct: boolean }) {
  const queue = useWithdrawalQueue();

  if (queue.status !== "ready") {
    return <QueueState feed={queue} empty="" />;
  }

  const waitingOn = queue.items.filter((w) => w.status === "REQUESTED" || w.status === "APPROVED");

  if (queue.items.length === 0) {
    return (
      <QueueState
        feed={queue}
        empty="No payout requests yet. When a partner asks to withdraw, it appears here."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {waitingOn.length > 0 ? (
        <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
          <strong style={{ color: "var(--text-heading)" }}>{waitingOn.length}</strong>{" "}
          {waitingOn.length === 1 ? "request is" : "requests are"} waiting on you.
        </p>
      ) : null}

      {queue.items.map((item) => (
        <WithdrawalRow key={item.id} item={item} canAct={canAct} onDone={queue.reload} />
      ))}
    </div>
  );
}

function WithdrawalRow({
  item,
  canAct,
  onDone,
}: {
  item: QueueWithdrawal;
  canAct: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<WithdrawalStatus | null>(null);
  const [note, setNote] = useState("");
  const [providerRef, setProviderRef] = useState("");
  const [error, setError] = useState<string | null>(null);

  const next = NEXT[item.status];
  const settled = next.length === 0;

  const run = async (to: WithdrawalStatus) => {
    setPending(to);
    setError(null);

    const result = await act(`/api/staff/withdrawals/${item.id}`, {
      to,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(providerRef.trim() ? { providerRef: providerRef.trim() } : {}),
    });

    setPending(null);
    if (result.ok) {
      onDone();
      return;
    }
    setError(result.message);
  };

  return (
    <Card padding="var(--space-6)" radius="var(--radius-lg)" elevation="sm">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-5)", alignItems: "flex-start" }}>
        {/* The amount, as the row's visual anchor. Display face at h3 rather than the
            UI sans: money is the content here, not a label. */}
        <div style={{ minWidth: 150 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-h3)",
              lineHeight: "var(--lh-tight)",
              color: "var(--text-heading)",
            }}
          >
            {money(item.amountMinor, item.currency)}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", fontFamily: "var(--font-ui)" }}>
            {item.reference}
          </div>
        </div>

        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ color: "var(--text-heading)", fontSize: "var(--fs-body)", fontWeight: "var(--fw-medium)" }}>
            {item.partner.org}
          </div>
          <div style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
            {item.partner.person} · {item.partner.territory}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", marginTop: 2 }}>
            {item.payoutMethod.label} {item.payoutMethod.maskedDetail} · {item.basis}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusDot status={item.status} />
          <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", fontFamily: "var(--font-ui)" }}>
            {item.status === "REQUESTED" ? waiting(item.requestedAt) : when(item.requestedAt)}
          </span>
        </div>
      </div>

      {/* History is one click away rather than always open: a settled row is reference
          material, and expanding every row by default would bury the ones needing work. */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 6, minHeight: 44,
          marginTop: "var(--space-3)", padding: 0, background: "transparent", border: "none",
          cursor: "pointer", color: "var(--text-link)", fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-body-sm)",
        }}
      >
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
        {open ? "Hide history" : `History (${item.events.length})`}
      </button>

      {open ? <History events={item.events} /> : null}

      {!settled && canAct ? (
        <div
          style={{
            marginTop: "var(--space-5)",
            paddingTop: "var(--space-5)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <Input
            id={`note-${item.id}`}
            label="Reason"
            hint="Required to reject. The partner is shown exactly this."
            placeholder="e.g. Bank details could not be verified"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {next.includes("PROCESSING") || next.includes("PAID") ? (
            <Input
              id={`ref-${item.id}`}
              label="Provider reference"
              hint="Required once money is moving. It is how this is reconciled against the provider's statement."
              placeholder="e.g. wise_9f2b41"
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
            />
          ) : null}

          {error ? (
            <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
              <Icon name="alert-circle" size={16} />
              {error}
            </span>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
            {next.map((to) => (
              <div key={to} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant={to === "REJECTED" ? "secondary" : "primary"}
                  size="md"
                  type="button"
                  disabled={pending !== null || (to === "REJECTED" && note.trim() === "")}
                  onClick={() => void run(to)}
                >
                  {pending === to ? "Working…" : ACTION_LABEL[to]}
                </Button>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", maxWidth: "26ch" }}>
                  {ACTION_CONSEQUENCE[to]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {settled ? (
        <p style={{ margin: "var(--space-4) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
          {item.status === "PAID"
            ? "Settled. This record cannot be changed."
            : "Rejected. The amount returned to the partner's balance."}
        </p>
      ) : null}
    </Card>
  );
}

/**
 * The audit trail.
 *
 * Append-only in the database — a Postgres trigger refuses `UPDATE` and `DELETE` on it.
 * Rendering it as a plain chronological list rather than a styled timeline is
 * deliberate: this is the record a payment dispute is settled from, and it should read
 * like evidence.
 */
function History({ events }: { events: QueueWithdrawal["events"] }) {
  if (events.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>No history yet.</p>;
  }

  return (
    <ol
      style={{
        listStyle: "none",
        margin: "var(--space-3) 0 0",
        padding: "var(--space-4)",
        background: "var(--surface-subtle)",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {events.map((event, i) => (
        <li key={i} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", fontSize: "var(--fs-body-sm)" }}>
          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", minWidth: 112, fontVariantNumeric: "tabular-nums" }}>
            {when(event.at)}
          </span>
          <span style={{ color: "var(--text-heading)" }}>
            {event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : `Created as ${event.toStatus}`}
          </span>
          <span style={{ color: "var(--text-body)" }}>
            {/* "System" rather than a blank: a webhook-driven transition has no human
                actor, and an empty column reads as missing data. */}
            {event.actor ? (event.actor.name ?? event.actor.email) : "System"}
          </span>
          {event.note ? (
            <span style={{ color: "var(--text-muted)", flexBasis: "100%" }}>“{event.note}”</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
