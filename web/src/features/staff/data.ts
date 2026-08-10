"use client";

/**
 * The staff console's data layer.
 *
 * Same shape as `features/portal/data.ts` and for the same reasons: no fallback to
 * fixtures, one place that knows the endpoints, and a failure that says so rather than
 * showing a plausible-looking empty queue. A payout queue that renders empty because
 * the request failed is worse than one that renders an error — the first looks like
 * "no work to do".
 */

import { useCallback, useEffect, useState } from "react";

export type WithdrawalStatus = "REQUESTED" | "APPROVED" | "PROCESSING" | "PAID" | "REJECTED";
export type CommissionState = "PENDING" | "CONFIRMED" | "REVERSED";
/**
 * Mirrors `leadTypes` on the server. Kept as a literal union rather than imported,
 * because this file is the client's own view of the API's shape and importing a server
 * module here drags the server's dependency graph into the browser bundle.
 */
export type LeadType =
  | "STUDY"
  | "MEDICAL"
  | "BUSINESS"
  | "EMPLOYMENT"
  | "TOURS"
  | "CONTACT"
  | "PARTNER"
  | "REPRESENTATIVE";

export interface QueueWithdrawal {
  id: string;
  reference: string;
  amountMinor: number;
  currency: string;
  status: WithdrawalStatus;
  period: string;
  basis: string;
  requestedAt: string;
  providerRef: string | null;
  partner: { id: string; org: string; person: string; territory: string };
  payoutMethod: { kind: string; label: string; maskedDetail: string };
  events: {
    fromStatus: WithdrawalStatus | null;
    toStatus: WithdrawalStatus;
    note: string | null;
    at: string;
    actor: { name: string | null; email: string } | null;
  }[];
}

export interface QueueCommission {
  id: string;
  amountMinor: number;
  currency: string;
  state: CommissionState;
  basis: string;
  period: string;
  confirmedAt: string | null;
  createdAt: string;
  student: { id: string; name: string; universityName: string };
  partner: { id: string; org: string };
}

/** One message. `payload` is `{ withheld }` when a medical enquiry was not asked for. */
export interface QueueInquiry {
  id: string;
  type: LeadType;
  subject: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
  retentionUntil: string;
}

/**
 * One person, with their newest message attached.
 *
 * `latest` is null only for a lead whose inquiries were all purged — the retention job
 * deletes those leads on its next pass, so it is a window, not a steady state.
 */
export interface QueueLead {
  id: string;
  kind: LeadType;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  serviceInterest: string | null;
  status: "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";
  assignedToUserId: string | null;
  consentAt: string;
  retentionUntil: string;
  createdAt: string;
  inquiryCount: number;
  latest: QueueInquiry | null;
}

export type Feed<T> =
  | { status: "loading" }
  | { status: "ready"; items: T[] }
  | { status: "failed"; message: string };

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (response.status === 401 || response.status === 403) throw new Error("session");
  if (!response.ok) throw new Error("request");
  return (await response.json()) as T;
}

/** POST that returns the server's message on refusal, because staff need the reason. */
export async function act(
  path: string,
  body: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) return { ok: true };

    const parsed = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    return {
      ok: false,
      // The API's refusals are already written for a person to read — "A reason is
      // required when rejecting a withdrawal" is more useful than "400 Bad Request".
      message: parsed.error?.message ?? "That did not go through. Try again.",
    };
  } catch {
    return { ok: false, message: "We could not reach the server. Nothing was changed." };
  }
}

/** One hook per queue rather than one that loads everything: the console shows one at a
 *  time, and fetching three queues to render one is three times the work for no gain. */
function useFeed<T>(path: string | null): Feed<T> & { reload: () => void } {
  const [state, setState] = useState<Feed<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!path) return;
    let live = true;
    setState({ status: "loading" });

    get<{ items: T[] }>(path)
      .then((data) => live && setState({ status: "ready", items: data.items }))
      .catch((error: unknown) => {
        if (!live) return;
        const expired = error instanceof Error && error.message === "session";
        setState({
          status: "failed",
          message: expired
            ? "Your session has expired. Sign in again."
            : "We could not load this queue. Nothing has been changed.",
        });
      });

    return () => {
      live = false;
    };
  }, [path, nonce]);

  return { ...state, reload };
}

export const useWithdrawalQueue = (status?: WithdrawalStatus) =>
  useFeed<QueueWithdrawal>(
    `/api/staff/withdrawals?limit=50${status ? `&status=${status}` : ""}`,
  );

export const useCommissionQueue = (state?: CommissionState) =>
  useFeed<QueueCommission>(
    `/api/staff/commissions?limit=50${state ? `&state=${state}` : ""}`,
  );

export const useLeadInbox = (kind?: LeadType) =>
  useFeed<QueueLead>(`/api/staff/leads?limit=50${kind ? `&kind=${kind}` : ""}`);

/** Money formatting. Minor units in, display string out; never float arithmetic. */
export const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).format(minor / 100);

/** "8 Aug, 14:32" — a reviewer needs the time of day, not just the date. */
export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** How long a request has been waiting. The queue's real unit of urgency. */
export function waiting(iso: string, now: Date = new Date()): string {
  const hours = Math.floor((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h waiting`;
  const days = Math.floor(hours / 24);
  return `${days}d waiting`;
}
