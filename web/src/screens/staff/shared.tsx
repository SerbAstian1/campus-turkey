"use client";

/**
 * Pieces shared across the three queues.
 *
 * Here rather than duplicated per queue so that "how a status looks" and "what an empty
 * queue says" have exactly one definition — System Consistency is a scored dimension,
 * and three near-identical status pills is precisely how it slips.
 */

import { Card, Icon } from "@/ds";
import type { ReactNode } from "react";
import type { CommissionState, Feed, WithdrawalStatus } from "@/features/staff/data";

/**
 * Status colours, and why they are dots-plus-text rather than coloured text.
 *
 * Measured against white (#FFFFFF):
 *   --status-warning  #C98A11  2.95:1  — fails AA for text
 *   --status-success  green-500 #26985E  3.66:1  — passes 3:1 UI, fails 4.5:1 text
 *   --status-danger   #B3352F  6.07:1  — passes
 *
 * Two of the three cannot legally carry the label. So the colour lives in a 8px dot
 * (a UI component, 3:1) and the word is always --text-heading at 12.08:1. Colour is
 * never the only carrier of meaning either, which is WCAG 1.4.1 rather than taste.
 */
const STATUS_TONE: Record<string, { dot: string; label: string }> = {
  REQUESTED: { dot: "var(--status-warning)", label: "Waiting" },
  APPROVED: { dot: "var(--green-500)", label: "Approved" },
  PROCESSING: { dot: "var(--green-600)", label: "Processing" },
  PAID: { dot: "var(--green-600)", label: "Paid" },
  REJECTED: { dot: "var(--status-danger)", label: "Rejected" },
  PENDING: { dot: "var(--status-warning)", label: "Pending" },
  // Representative applications only. Without it the fallback prints the enum itself —
  // "UNDER_REVIEW" in a column where every neighbour reads as English.
  UNDER_REVIEW: { dot: "var(--status-warning)", label: "Under review" },
  CONFIRMED: { dot: "var(--green-600)", label: "Confirmed" },
  REVERSED: { dot: "var(--status-danger)", label: "Reversed" },
  NEW: { dot: "var(--status-warning)", label: "New" },
  CONTACTED: { dot: "var(--green-500)", label: "Contacted" },
  CONVERTED: { dot: "var(--green-600)", label: "Converted" },
  CLOSED: { dot: "var(--neutral-400)", label: "Closed" },
};

export function StatusDot({ status }: { status: WithdrawalStatus | CommissionState | string }) {
  const tone = STATUS_TONE[status] ?? { dot: "var(--neutral-400)", label: status };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-body-sm)",
        fontWeight: "var(--fw-medium)",
        color: "var(--text-heading)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "var(--radius-circle)",
          background: tone.dot,
          flexShrink: 0,
        }}
      />
      {tone.label}
    </span>
  );
}

/**
 * Loading, failure and empty, in one place.
 *
 * No skeleton rows. A placeholder shaped like a payout is a number the eye reads before
 * it is told not to, and this is a screen about money.
 */
export function QueueState<T>({ feed, empty }: { feed: Feed<T>; empty: string }): ReactNode {
  if (feed.status === "loading") {
    return (
      <p aria-busy="true" aria-live="polite" style={{ color: "var(--text-muted)", fontSize: "var(--fs-body-sm)" }}>
        Loading…
      </p>
    );
  }

  if (feed.status === "failed") {
    return (
      <Card padding="var(--space-6)" radius="var(--radius-lg)">
        <span role="alert" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
          <Icon name="alert-circle" size={18} />
          {feed.message}
        </span>
      </Card>
    );
  }

  if (feed.items.length === 0 && empty) {
    return (
      <Card padding="var(--space-8)" radius="var(--radius-lg)">
        <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)", maxWidth: "52ch" }}>
          {empty}
        </p>
      </Card>
    );
  }

  return null;
}

/** A filter row. Tabs would imply separate places; these are one list, filtered. */
export function Filters({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  return (
    <div role="group" aria-label="Filter" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
      {[{ key: "", label: "All" }, ...options].map((option) => {
        const active = (option.key || null) === value;
        return (
          <button
            key={option.key || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key || null)}
            style={{
              minHeight: 44,
              padding: "0 var(--space-4)",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-body-sm)",
              fontWeight: active ? "var(--fw-semibold)" : "var(--fw-regular)",
              // Active state is border + weight, not the brand green as a fill —
              // white on --action-primary measures 2.84:1 and fails AA.
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
  );
}
