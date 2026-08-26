/**
 * Error reporting.
 *
 * Sentry is initialised lazily, on the first error worth reporting, from inside the
 * Node runtime only.
 *
 * The obvious alternative is Next's `instrumentation.ts`, which is what Sentry's own
 * setup uses. It was tried and reverted: Next compiles that file for the Edge runtime
 * as well, which pulled a 263 kB Sentry bundle into the edge output and took the
 * middleware from 35 kB to 119 kB — on a middleware that runs for every request to
 * every page. The `NEXT_RUNTIME` guard does not help, because webpack still has to
 * bundle a dynamic import it cannot prove is dead.
 *
 * Reporting from here instead is smaller *and* more precise: every API error already
 * funnels through one catch block in `server/http/handler.ts`, so there is exactly one
 * place to call this from and it has the request id, the route and the session to hand.
 *
 * What this does not cover: an error thrown while rendering a server component. Those
 * still reach the structured log and the `RouteBoundary`. If that gap matters more than
 * the edge bundle later, `instrumentation.ts` is how to close it — knowingly, and with
 * the cost written down here.
 */

import { env, isProduction } from "./config";

type SentryModule = typeof import("@sentry/nextjs");

let sentry: SentryModule | null = null;
let initialising: Promise<SentryModule | null> | null = null;

async function client(): Promise<SentryModule | null> {
  if (!env.SENTRY_DSN) return null;
  if (sentry) return sentry;

  // One initialisation even under concurrent errors, which is the moment several
  // requests are most likely to fail at once.
  initialising ??= (async () => {
    const sdk = await import("@sentry/nextjs");

    sdk.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,

      /*
       * 10% of traces in production, all of them locally. Errors are always captured —
       * this rate governs performance traces only, and full tracing on a site serving
       * 1,110 prerendered pages is a large bill for information that repeats.
       */
      tracesSampleRate: isProduction ? 0.1 : 1,

      /**
       * The same rule the logger follows: ids and amounts are safe, people are not.
       *
       * Sentry attaches request bodies by default, and this application's bodies
       * include lead payloads carrying passport-adjacent and, on the medical desk,
       * health data. That is the most likely way personal data leaves this system by
       * accident.
       */
      sendDefaultPii: false,

      beforeSend(event) {
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers["authorization"];
            delete event.request.headers["cookie"];
            delete event.request.headers["x-signature"];
          }
        }
        return event;
      },

      ignoreErrors: [
        // Framework control flow, not failure — `notFound()` and `redirect()` throw.
        "NEXT_NOT_FOUND",
        "NEXT_REDIRECT",
        "NEXT_HTTP_ERROR_FALLBACK",
      ],
    });

    sentry = sdk;
    return sdk;
  })();

  return initialising;
}

export interface ReportContext {
  requestId: string;
  route?: string;
  method?: string;
  userId?: string;
  partnerId?: string;
}

/**
 * Report an error, or do nothing when tracking is not configured.
 *
 * Never throws and never awaits the network: a failure inside the error reporter must
 * not turn a handled 500 into an unhandled one.
 */
export function reportError(error: unknown, context: ReportContext): void {
  void client()
    .then((sdk) => {
      if (!sdk) return;

      sdk.withScope((scope) => {
        // The correlation id is the whole point — it is what joins a Sentry event to
        // the structured log line that carries the detail.
        scope.setTag("requestId", context.requestId);
        if (context.route) scope.setTag("route", context.route);
        if (context.method) scope.setTag("method", context.method);
        // Ids only. No email, no name.
        if (context.userId) scope.setUser({ id: context.userId });
        if (context.partnerId) scope.setTag("partnerId", context.partnerId);

        sdk.captureException(error);
      });
    })
    .catch(() => {
      /* Reporting is best-effort. The structured log already has this error. */
    });
}
