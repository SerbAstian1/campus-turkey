/**
 * The route wrapper. Every API endpoint in this application is defined through it.
 *
 * Next.js route handlers have no middleware chain, so the stack is composed here
 * instead — once, in one order, for every endpoint:
 *
 *   request id -> logging -> origin check (CSRF) -> rate limit -> body size cap
 *     -> body/query validation -> authentication -> authorization -> handler
 *     -> error mapping
 *
 * Two ordering decisions are worth defending:
 *
 *   The origin check runs before the rate limiter. A cross-site forgery attempt should
 *   cost the attacker their own rate budget, not the victim's.
 *
 *   Rate limiting runs before authentication. Limiting after auth protects the database
 *   but leaves the sign-in endpoint itself — the one credential stuffing actually
 *   targets — unprotected. Authenticated endpoints get a *second*, per-user limit after
 *   the session resolves, so a single compromised account cannot spend everyone's
 *   shared IP budget.
 *
 * The design point of this file: `access` is a required field. There is no way to
 * define an endpoint without stating its authorization rule, because the type will not
 * compile. Department 19's "count of endpoints with no stated rule" is structurally
 * zero rather than zero by inspection.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { env, isProduction } from "@/server/lib/config";
import { requestLogger, type RequestLogger } from "@/server/lib/logger";
import {
  ForbiddenError,
  UnauthenticatedError,
  ValidationError,
  toErrorResponse,
  isAlertable,
} from "@/server/lib/errors";
import { enforceRateLimit, type RateLimitPolicy } from "@/server/lib/ratelimit";
import { reportError } from "@/server/lib/reporting";
import { canAct, hasPermission, type Permission } from "@/server/lib/permissions";
import { resolveSession } from "./session";
import type { Session } from "./session";

/** 64KB. No endpoint here legitimately receives more; the lead forms are the largest. */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * The authorization rule, stated per endpoint.
 *
 * `public` is a deliberate declaration, not an absence — writing it is an assertion
 * that the endpoint is safe unauthenticated, and it shows up in the coverage table as
 * a stated rule rather than a gap.
 */
export type Access =
  | { kind: "public" }
  | { kind: "partner" }
  | { kind: "staff"; roles: ReadonlyArray<"SUPPORT" | "FINANCE" | "ADMIN"> }
  /**
   * Permission-based access — brief §33, and where all of these are heading.
   *
   * The three kinds above name *who* may call an endpoint; this one names *what the
   * caller must be able to do*, which is the question authorization is actually about.
   * The difference shows the moment a role changes: `{ kind: "staff", roles: [...] }`
   * has to be found and edited at every call site, while a permission grant moves in
   * `permissions.ts` alone.
   *
   * Both forms are live at once on purpose. Converting twenty-one endpoints in the same
   * change that introduces the mechanism would mean the mechanism and every use of it
   * are unverified together — so the mechanism lands first with its own tests, and
   * endpoints move across one at a time behind them.
   *
   * This only answers "may this kind of user do this kind of thing". Whether the record
   * in question belongs to the caller is the service's job, every time.
   */
  | { kind: "permission"; require: readonly Permission[] };

export interface RouteContext<TBody, TQuery> {
  body: TBody;
  query: TQuery;
  params: Record<string, string>;
  session: Session;
  log: RequestLogger;
  requestId: string;
  request: NextRequest;
}

interface RouteConfig<TBody, TQuery, TResult> {
  /** Required. This is the endpoint's authorization rule. */
  access: Access;
  /** Required. Every endpoint states its limit; `RATE_LIMITS.none` is the opt-out. */
  rateLimit: RateLimitPolicy;
  /**
   * The third type argument is `unknown`, not the default.
   *
   * `z.ZodType<T>` expands to `ZodType<T, ZodTypeDef, T>`, which forces a schema's
   * input and output types to be the same. Any schema using `.default()` or
   * `.coerce` has different ones — `limit` is optional going in and always a number
   * coming out — so inference degrades to the *input* type and every handler sees
   * `number | undefined` where it should see `number`. Pinning the input to `unknown`
   * (which is accurate: this is parsing untrusted JSON) lets `T` infer from the output
   * alone, which is what the handler actually receives.
   */
  body?: z.ZodType<TBody, z.ZodTypeDef, unknown>;
  query?: z.ZodType<TQuery, z.ZodTypeDef, unknown>;
  /** Cache-Control for the response. Omitted means `no-store`, the safe default. */
  cacheControl?: string;
  handler: (ctx: RouteContext<TBody, TQuery>) => Promise<TResult>;
}

/**
 * Cross-site request forgery defence.
 *
 * Session cookies are `SameSite=Lax`, which already blocks cross-site POSTs from a
 * plain form navigation. The origin check closes what Lax does not: same-site
 * subdomain attacks, and browsers where Lax is not yet the default. Checking the
 * `Origin` header is preferred over a synchroniser token because there is no token to
 * mint, store, rotate or forget to send.
 *
 * `Origin` is absent on some same-origin GETs, which is why this only guards mutations.
 */
function assertSameOrigin(request: NextRequest): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

  const origin = request.headers.get("origin");
  if (!origin) {
    // A mutation with no Origin is either a non-browser client or a very old one.
    // Refusing is the safe default; API consumers that need this can be given a token
    // -authenticated path that does not rely on cookies at all.
    throw new ForbiddenError("This request could not be verified. Please reload and try again.");
  }

  if (origin !== env.SITE_ORIGIN) {
    throw new ForbiddenError("This request could not be verified. Please reload and try again.");
  }
}

/** Flatten a Zod error into the field map the client's form layer renders. */
function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

async function readBody(request: NextRequest): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    throw new ValidationError({ _: ["That request is too large."] });
  }

  const text = await request.text();
  // Checked again after reading: `Content-Length` is client-supplied and a chunked
  // request has none at all, so the declared size is a hint, not a guarantee.
  if (text.length > MAX_BODY_BYTES) {
    throw new ValidationError({ _: ["That request is too large."] });
  }
  if (text.length === 0) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError({ _: ["That request body was not valid JSON."] });
  }
}

export function route<TBody = undefined, TQuery = undefined, TResult = unknown>(
  config: RouteConfig<TBody, TQuery, TResult>,
) {
  return async function handle(
    request: NextRequest,
    routeArgs?: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> {
    // A client-supplied id would let a caller collide their request with someone
    // else's log stream, so it is generated here and only echoed back.
    const requestId = randomUUID();
    const started = Date.now();

    const log = requestLogger({
      requestId,
      route: new URL(request.url).pathname,
      method: request.method,
    });

    try {
      assertSameOrigin(request);

      await enforceRateLimit(config.rateLimit, { request, scope: "ip" });

      const params = routeArgs?.params ? await routeArgs.params : {};

      let resolvedBody = undefined as TBody;
      if (config.body) {
        const parsed = config.body.safeParse(await readBody(request));
        if (!parsed.success) throw new ValidationError(toFieldErrors(parsed.error));
        resolvedBody = parsed.data;
      }

      let resolvedQuery = undefined as TQuery;
      if (config.query) {
        const raw = Object.fromEntries(new URL(request.url).searchParams);
        const parsed = config.query.safeParse(raw);
        if (!parsed.success) throw new ValidationError(toFieldErrors(parsed.error));
        resolvedQuery = parsed.data;
      }

      /**
       * Public endpoints do not resolve a session.
       *
       * `resolveSession` costs a session-store lookup, and on a signed-in visitor a
       * second query for the partner record. `/api/translate` runs at up to 120
       * requests a minute per visitor and `/api/leads` is the front door of the
       * business; neither reads `ctx.session`, so paying for it on every call would be
       * two queries bought to be discarded.
       */
      const session: Session =
        config.access.kind === "public"
          ? { user: null, partner: null, representative: null }
          : await resolveSession(request);

      // ---- authorization. Enforced here, before the handler runs.
      if (config.access.kind === "partner") {
        if (!session.user) throw new UnauthenticatedError();
        if (!session.partner) {
          throw new ForbiddenError("This area is for registered partners.");
        }
        // A second, per-user limit. Without it one authenticated account can exhaust
        // the shared IP budget for everyone behind the same NAT.
        await enforceRateLimit(config.rateLimit, {
          request,
          scope: "user",
          identifier: session.user.id,
        });
      }

      if (config.access.kind === "staff") {
        if (!session.user) throw new UnauthenticatedError();
        const role = session.user.staffRole;
        if (!role || !config.access.roles.includes(role)) {
          log.warn("staff authorization refused", {
            userId: session.user.id,
            required: config.access.roles,
          });
          throw new ForbiddenError("You do not have access to that.");
        }
        await enforceRateLimit(config.rateLimit, {
          request,
          scope: "user",
          identifier: session.user.id,
        });
      }

      if (config.access.kind === "permission") {
        if (!session.user) throw new UnauthenticatedError();

        const principal = {
          role: session.user.role,
          status: session.user.status,
          department: session.user.department ?? null,
        };

        // Status first, and separately, so the log distinguishes "this account is
        // barred" from "this account lacks a permission". They need different answers
        // from support, and a single "forbidden" line cannot tell them apart at 2am.
        if (!canAct(principal)) {
          log.warn("authorization refused: account not active", {
            userId: session.user.id,
            status: principal.status,
          });
          throw new ForbiddenError("This account is not active.");
        }

        if (!hasPermission(principal, config.access.require)) {
          log.warn("authorization refused: missing permission", {
            userId: session.user.id,
            role: principal.role,
            required: config.access.require,
          });
          throw new ForbiddenError("You do not have access to that.");
        }

        await enforceRateLimit(config.rateLimit, {
          request,
          scope: "user",
          identifier: session.user.id,
        });
      }

      const boundLog = requestLogger({
        requestId,
        route: new URL(request.url).pathname,
        method: request.method,
        ...(session.user ? { userId: session.user.id } : {}),
        ...(session.partner ? { partnerId: session.partner.id } : {}),
      });

      const result = await config.handler({
        body: resolvedBody,
        query: resolvedQuery,
        params,
        session,
        log: boundLog,
        requestId,
        request,
      });

      boundLog.info("request completed", {
        status: 200,
        durationMs: Date.now() - started,
      });

      return NextResponse.json(result, {
        status: 200,
        headers: {
          "x-request-id": requestId,
          // Authenticated responses are never cached by a shared cache. The default is
          // no-store because every endpoint here returns something partner-specific;
          // the two public endpoints set their own.
          "cache-control": config.cacheControl ?? "no-store",
        },
      });
    } catch (error) {
      const { status, body, headers } = toErrorResponse(error, requestId);

      if (isAlertable(error)) {
        // Error tracking. Only 5xx — a 404 or a rate limit is not an incident, and
        // reporting them buries the ones that are. Best-effort and non-blocking.
        reportError(error, {
          requestId,
          route: new URL(request.url).pathname,
          method: request.method,
        });

        log.error("request failed", {
          status,
          durationMs: Date.now() - started,
          // The full error, including the stack, goes to the log and not the response.
          error: error instanceof Error ? error : { thrown: String(error) },
          ...(error instanceof Error && "context" in error
            ? { context: (error as { context: Record<string, unknown> }).context }
            : {}),
        });
      } else {
        log.info("request refused", { status, durationMs: Date.now() - started, code: body.error.code });
      }

      return NextResponse.json(body, {
        status,
        headers: { ...headers, "x-request-id": requestId, "cache-control": "no-store" },
      });
    }
  };
}

/**
 * Health check. Separate from `route` because it must not require configuration,
 * must not touch the session, and must stay cheap enough to poll every 30 seconds.
 */
export async function healthResponse(check: () => Promise<boolean>): Promise<NextResponse> {
  const healthy = await check().catch(() => false);
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", environment: isProduction ? "production" : env.NODE_ENV },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
