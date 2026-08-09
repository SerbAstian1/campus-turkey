"use client";

/**
 * The commission queue.
 *
 * Confirming is the moment a partner's money becomes withdrawable, so the copy says
 * that in as many words rather than leaving "Confirm" to be inferred. Reversing after
 * confirmation is the one action here that can put a balance negative — the money may
 * already be gone — so it is styled as secondary, requires a reason, and warns before
 * it is taken.
 *
 * Filtered to Pending by default. The queue's purpose is the work waiting in it, and
 * opening on "All" would bury four unconfirmed commissions under four hundred settled
 * ones.
 */

import { useState } from "react";
import { Button, Card, Icon, Input } from "@/ds";
import {
  act, money, when,
  useCommissionQueue, type CommissionState, type QueueCommission,
} from "@/features/staff/data";
import { Filters, QueueState, StatusDot } from "./shared";

const STATES: { key: string; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "REVERSED", label: "Reversed" },
];

export function CommissionQueue({ canAct }: { canAct: boolean }) {
  const [filter, setFilter] = useState<CommissionState | null>("PENDING");
  const queue = useCommissionQueue(filter ?? undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <Filters
        options={STATES}
        value={filter}
        onChange={(key) => setFilter((key as CommissionState) ?? null)}
      />

      <QueueState
        feed={queue}
        empty={
          filter === "PENDING"
            ? "Nothing waiting to be confirmed. A commission has to be recorded against a student before it appears here."
            : "Nothing in this state."
        }
      />

      {queue.status === "ready"
        ? queue.items.map((item) => (
            <CommissionRow key={item.id} item={item} canAct={canAct} onDone={queue.reload} />
          ))
        : null}
    </div>
  );
}

function CommissionRow({
  item,
  canAct,
  onDone,
}: {
  item: QueueCommission;
  canAct: boolean;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<CommissionState | null>(null);
  const [confirmingReversal, setConfirmingReversal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (to: CommissionState) => {
    setPending(to);
    setError(null);

    const result = await act(`/api/staff/commissions/${item.id}`, {
      to,
      ...(note.trim() ? { note: note.trim() } : {}),
    });

    setPending(null);
    if (result.ok) {
      onDone();
      return;
    }
    setError(result.message);
  };

  const settled = item.state === "REVERSED";
  const wasConfirmed = item.state === "CONFIRMED";

  return (
    <Card padding="var(--space-6)" radius="var(--radius-lg)" elevation="sm">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-5)", alignItems: "flex-start" }}>
        <div style={{ minWidth: 130 }}>
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
            {item.period}
          </div>
        </div>

        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ color: "var(--text-heading)", fontSize: "var(--fs-body)", fontWeight: "var(--fw-medium)" }}>
            {item.student.name}
          </div>
          <div style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
            {item.student.universityName} · via {item.partner.org}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", marginTop: 2 }}>
            {item.basis}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusDot status={item.state} />
          <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", fontFamily: "var(--font-ui)" }}>
            {item.confirmedAt ? `Confirmed ${when(item.confirmedAt)}` : when(item.createdAt)}
          </span>
        </div>
      </div>

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
          {/* The warning appears only when it applies — before a reversal that can take
              back money already withdrawn. A permanent caution is one people stop reading. */}
          {confirmingReversal && wasConfirmed ? (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: "var(--space-4)",
                borderRadius: "var(--radius-sm)",
                background: "#FDF3F2",
                border: "1px solid #F0D4D2",
                color: "var(--text-body)",
                fontSize: "var(--fs-body-sm)",
                maxWidth: "62ch",
              }}
            >
              <strong style={{ color: "var(--status-danger)" }}>This was already confirmed.</strong>{" "}
              Reversing it removes {money(item.amountMinor, item.currency)} from{" "}
              {item.partner.org}&rsquo;s balance. If they have already withdrawn against it, their
              balance goes negative and further withdrawals are refused until someone resolves it.
            </p>
          ) : null}

          <Input
            id={`note-${item.id}`}
            label="Reason"
            hint="Required to reverse."
            placeholder="e.g. Registration cancelled by the university"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error ? (
            <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
              <Icon name="alert-circle" size={16} />
              {error}
            </span>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
            {item.state === "PENDING" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void run("CONFIRMED")}
                >
                  {pending === "CONFIRMED" ? "Working…" : "Confirm"}
                </Button>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", maxWidth: "30ch" }}>
                  Makes this withdrawable by {item.partner.org}.
                </span>
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Button
                variant="secondary"
                size="md"
                type="button"
                disabled={pending !== null || note.trim() === ""}
                onClick={() => {
                  // Confirmed money gets a second press. Pending money does not — there
                  // is nothing to take back yet, and a confirmation step there would be
                  // ceremony that teaches people to click through warnings.
                  if (wasConfirmed && !confirmingReversal) {
                    setConfirmingReversal(true);
                    return;
                  }
                  void run("REVERSED");
                }}
              >
                {pending === "REVERSED"
                  ? "Working…"
                  : confirmingReversal
                    ? "Yes, reverse it"
                    : "Reverse"}
              </Button>
              <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", maxWidth: "30ch" }}>
                {wasConfirmed ? "Takes the amount back." : "Marks it as not owed."}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {settled ? (
        <p style={{ margin: "var(--space-4) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
          Reversed. Record a new commission if this needs reinstating — reversals are not undone.
        </p>
      ) : null}
    </Card>
  );
}
