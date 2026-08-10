"use client";

/**
 * Public form submission.
 *
 * Every form on the site — Apply, Contact, Partner registration, Representative
 * registration, and the medical desk — posts through here to `POST /api/leads`.
 *
 * Before this existed each form advanced its own state on submit and sent nothing
 * anywhere. `app/README.md` was blunt about why that matters: *"a contact form that
 * silently drops messages is worse than none, because the visitor believes they reached
 * you."* The whole point of this module is that the confirmation panel appears only
 * after the server has said it stored the lead.
 *
 * The server validates the same shapes with Zod (`server/modules/leads/leads.service.ts`)
 * and is the authority. Nothing here re-implements that; it reports what came back.
 */

import { useCallback, useState } from "react";

export type LeadType =
  | "STUDY"
  | "MEDICAL"
  | "BUSINESS"
  | "EMPLOYMENT"
  | "TOURS"
  | "CONTACT"
  | "PARTNER"
  | "REPRESENTATIVE";

export type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "failed"; message: string; fields?: Record<string, string[]> };

interface ErrorBody {
  error?: { message?: string; fields?: Record<string, string[]> };
}

/**
 * The captcha token.
 *
 * Turnstile renders a widget and hands back a token; until that widget is added this
 * returns a placeholder. That is safe in exactly one direction: production refuses to
 * boot with `CAPTCHA_PROVIDER=disabled` (see server/lib/config.ts), and a configured
 * provider will reject this placeholder outright. So an unfinished captcha fails loudly
 * in staging rather than quietly shipping an open form.
 *
 * Replacing this is a contained job: render the Turnstile widget, and return its token.
 */
async function captchaToken(): Promise<string> {
  const widget = (globalThis as { turnstile?: { getResponse: () => string } }).turnstile;
  return widget?.getResponse() ?? "development-placeholder-token";
}

/**
 * Drop empty optional fields before sending.
 *
 * The Zod schemas mark most fields optional, but `""` is not the same as absent: an
 * empty string fails `.url()` and `.email()` and produces a validation error about a
 * field the visitor deliberately left blank.
 */
function compact(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined && value !== null),
  );
}

/**
 * Where this visit came from — brief §20.
 *
 * Read at submit time rather than on mount, from the URL and the referrer, and stored
 * nowhere in between. A cookie or a localStorage entry would follow the visitor around
 * the site for the sake of a campaign name, which is more tracking than the work needs
 * and would need its own consent banner to be honest about.
 *
 * The consequence is deliberate: attribution is captured when someone arrives on a
 * campaign link *and* fills the form in that same visit. It undercounts rather than
 * inventing a journey, and undercounting is the failure a marketing report can survive.
 *
 * The query string is dropped from `landingPage` and only the origin is kept from
 * `referrer` — a full referrer carries the search terms someone typed elsewhere.
 */
function attribution(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;

  const params = new URLSearchParams(window.location.search);
  const utm = (key: string): string | undefined => params.get(`utm_${key}`)?.trim() || undefined;

  let referrer: string | undefined;
  try {
    referrer = document.referrer ? new URL(document.referrer).origin : undefined;
    // Our own pages are not a referral source; recording them would credit the site for
    // every visitor who read two pages before writing in.
    if (referrer === window.location.origin) referrer = undefined;
  } catch {
    referrer = undefined;
  }

  const found = {
    ...(utm("source") ? { source: utm("source")! } : {}),
    ...(utm("medium") ? { medium: utm("medium")! } : {}),
    ...(utm("campaign") ? { campaign: utm("campaign")! } : {}),
    ...(utm("term") ? { term: utm("term")! } : {}),
    ...(utm("content") ? { content: utm("content")! } : {}),
    ...(referrer ? { referrer } : {}),
  };

  // The landing page is only worth sending alongside something that explains it.
  if (Object.keys(found).length === 0) return undefined;
  return { ...found, landingPage: window.location.pathname };
}

export function useLeadSubmit(kind: LeadType, serviceInterest?: string) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const submit = useCallback(
    async (payload: Record<string, unknown>, consent: boolean): Promise<boolean> => {
      if (!consent) {
        // The server refuses this too — `consent: z.literal(true)` — but saying so here
        // avoids a round trip to tell someone they missed a checkbox.
        setState({
          status: "failed",
          message: "Please confirm we may contact you about your enquiry.",
        });
        return false;
      }

      setState({ status: "sending" });
      const source = attribution();

      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind,
            payload: compact(payload),
            consent: true,
            captchaToken: await captchaToken(),
            ...(serviceInterest ? { serviceInterest } : {}),
            ...(source ? { attribution: source } : {}),
          }),
        });

        if (response.ok) {
          setState({ status: "sent" });
          return true;
        }

        const body = (await response.json().catch(() => ({}))) as ErrorBody;

        // 429 gets its own wording: "something went wrong" is wrong and unhelpful when
        // the real answer is "you have sent several already, wait a moment".
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
        // Network failure, not a rejection. The visitor's details are still in the form.
        setState({
          status: "failed",
          message: "We could not reach us — check your connection and try again. Nothing was lost.",
        });
        return false;
      }
    },
    [kind, serviceInterest],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, submit, reset };
}
