"use client";

/**
 * Representative application submission.
 *
 * Separate from `features/leads/submit.ts` because the destination is different in kind,
 * not just in shape: a lead is an enquiry somebody replies to, an application is a
 * decision somebody makes. §23 keeps them apart in the database and this keeps them apart
 * on the way in, so a change to lead handling cannot silently alter how applications are
 * recorded.
 *
 * The server is the authority on validation. Nothing here re-implements it; this reports
 * what came back.
 */

import { useCallback, useState } from "react";

export type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "failed"; message: string; fields?: Record<string, string[]> };

export interface RepresentativeApplication {
  /** Index signature so this can be passed to `compact`, which works on any record.
   *  Declared rather than cast at the call site: a cast there would hide a genuinely
   *  wrong shape as easily as this one. */
  [field: string]: string | undefined;
  fullName: string;
  organizationName?: string;
  country: string;
  territory?: string;
  email: string;
  phone?: string;
  address?: string;
  message?: string;
}

/** Empty optional fields are dropped: `""` fails `.email()` and `.url()` and produces a
 *  validation error about a field somebody deliberately left blank. */
function compact(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );
}

export function useRepresentativeApplication() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const submit = useCallback(
    async (application: RepresentativeApplication, consent: boolean): Promise<boolean> => {
      if (!consent) {
        // The server refuses this too. Saying so here avoids a round trip to tell
        // somebody they missed a checkbox.
        setState({
          status: "failed",
          message: "Please confirm we may contact you about your application.",
        });
        return false;
      }

      setState({ status: "sending" });

      try {
        const response = await fetch("/api/representative-applications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...compact(application), consent: true }),
        });

        if (response.ok) {
          setState({ status: "sent" });
          return true;
        }

        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; fields?: Record<string, string[]> };
        };

        const message =
          response.status === 429
            ? "You have sent a few of these already. Please wait a moment and try again."
            : (body.error?.message ??
              "We could not send that. Please try again, or message us on WhatsApp.");

        setState({
          status: "failed",
          message,
          ...(body.error?.fields ? { fields: body.error.fields } : {}),
        });
        return false;
      } catch {
        setState({
          status: "failed",
          message: "We could not reach the server. Check your connection and try again.",
        });
        return false;
      }
    },
    [],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, submit, reset };
}
