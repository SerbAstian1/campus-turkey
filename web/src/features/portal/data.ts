"use client";

/**
 * The portal's data layer.
 *
 * Everything the dashboard renders comes from here, and every field of it comes from the
 * server. Before this existed the portal read `content/portal.ts` — a fixed set of
 * students and a fixed balance — which made it a convincing demo of a screen rather than
 * a view of anyone's money.
 *
 * Four requests in parallel rather than four waterfalls: they are independent, and a
 * dashboard that reveals itself a panel at a time reads as slow even when the total is
 * the same.
 *
 * There is deliberately no fallback to the static content on failure. A portal that
 * quietly shows fictional balances when the API is down is worse than one that says it
 * cannot reach the server, because the first kind gets believed.
 */

import { useCallback, useEffect, useState } from "react";
import type {
  PayoutMethod, PipelineStage, PortalAccount, PortalStudent, Wallet, Withdrawal,
} from "@/content/types";

export interface PortalData {
  account: PortalAccount;
  wallet: Wallet;
  students: PortalStudent[];
  pipeline: PipelineStage[];
  withdrawals: Withdrawal[];
}

export type PortalState =
  | { status: "loading" }
  | { status: "ready"; data: PortalData }
  | { status: "failed"; message: string };

/** Read a JSON endpoint, or throw something worth showing a person. */
async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (response.status === 401 || response.status === 403) {
    // The session expired mid-visit. This is the trigger handoff note 12 describes for
    // the `sessionExpired` screen — a refresh failure, not a timer.
    throw new Error("session");
  }
  if (!response.ok) throw new Error(`Request to ${path} failed`);

  return (await response.json()) as T;
}

/**
 * "2 days ago" rather than an ISO timestamp.
 *
 * `PortalStudent.updated` is a display string in the contract, and the server sends
 * ISO-8601 because a server has no business deciding the reader's locale or phrasing.
 * The conversion belongs here, at the edge.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

interface StudentsResponse {
  items: PortalStudent[];
  nextCursor: string | null;
  pipeline: PipelineStage[];
}

interface WithdrawalsResponse {
  items: Withdrawal[];
  nextCursor: string | null;
}

export function usePortalData(): PortalState & { reload: () => void } {
  const [state, setState] = useState<PortalState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const [account, wallet, students, withdrawals] = await Promise.all([
          get<PortalAccount>("/api/partner/account"),
          get<Wallet>("/api/partner/wallet"),
          get<StudentsResponse>("/api/partner/students?limit=50"),
          get<WithdrawalsResponse>("/api/partner/withdrawals?limit=20"),
        ]);

        if (!live) return;

        setState({
          status: "ready",
          data: {
            account,
            wallet,
            students: students.items.map((s) => ({ ...s, updated: relativeTime(s.updated) })),
            pipeline: students.pipeline,
            withdrawals: withdrawals.items,
          },
        });
      } catch (error) {
        if (!live) return;
        const expired = error instanceof Error && error.message === "session";
        setState({
          status: "failed",
          message: expired ? "session" : "unreachable",
        });
      }
    })();

    return () => {
      live = false;
    };
  }, [nonce]);

  return { ...state, reload };
}

/** Convenience for the payout-method sheet, which needs the list on its own. */
export async function refreshPayoutMethods(): Promise<PayoutMethod[]> {
  try {
    return await get<PayoutMethod[]>("/api/partner/payout-methods");
  } catch {
    return [];
  }
}
