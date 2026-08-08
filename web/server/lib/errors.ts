/**
 * The error taxonomy, and the single place errors become HTTP responses.
 *
 * One pattern, used everywhere: services throw `AppError` subclasses expressed in
 * domain terms; the route wrapper in `server/http/handler.ts` catches them and maps
 * them here. Services never know an HTTP status; routes never decide what went wrong.
 *
 * The rule this file enforces: an unrecognised error becomes a 500 whose body says
 * nothing. Stack traces, Prisma messages and database identifiers do not reach the
 * client. They go to the log, correlated by request id, where the person debugging can
 * find them and the person attacking cannot.
 */

/** What the client receives. Stable shape across every endpoint. */
export interface ErrorBody {
  error: {
    /** Machine-readable, safe to branch on. */
    code: string;
    /** Human-readable, safe to display. Never contains internals. */
    message: string;
    /** Field-level detail, present only on validation failures. */
    fields?: Record<string, string[]>;
    /** Echoed so a user can quote it to support and support can find the log line. */
    requestId: string;
  };
}

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  /**
   * Structured context for the log. Never serialised into the response. Put the ids
   * and the amounts here — never the payout token, the session token or the payload.
   */
  readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

/** 400 — the input did not satisfy the schema at the boundary. */
export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "validation_failed";
  readonly fields: Record<string, string[]>;

  constructor(fields: Record<string, string[]>, message = "Some details need correcting.") {
    super(message, { fieldCount: Object.keys(fields).length });
    this.fields = fields;
  }
}

/** 401 — no valid session. Distinct from 403: sign in and try again may work. */
export class UnauthenticatedError extends AppError {
  readonly status = 401;
  readonly code = "unauthenticated";
  constructor(message = "Please sign in to continue.") {
    super(message);
  }
}

/**
 * 403 — authenticated, but not permitted.
 *
 * Used when the resource's existence is not itself a secret. Where it is — another
 * partner's withdrawal, another partner's payout method — throw `NotFoundError`
 * instead, so the endpoint cannot be used to confirm that an id exists.
 */
export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "forbidden";
  constructor(message = "You do not have access to that.", context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

/**
 * 404 — not found, or not yours. Deliberately the same response for both.
 *
 * This is the load-bearing choice that keeps object ids from being enumerable. The log
 * records which of the two it actually was; the client cannot tell.
 */
export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "not_found";
  constructor(message = "We could not find that.", context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

/** 409 — the request was valid but the current state refuses it. */
export class ConflictError extends AppError {
  readonly status = 409;
  readonly code: string;
  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message, context);
    this.code = code;
  }
}

/** 422 — well-formed and understood, but not actionable as asked. */
export class UnprocessableError extends AppError {
  readonly status = 422;
  readonly code: string;
  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message, context);
    this.code = code;
  }
}

/** 429 — rate limited. Always accompanied by `Retry-After`. */
export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code = "rate_limited";
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message = "Too many requests. Please wait a moment.") {
    super(message, { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * 502 — a third party failed after its retry budget was spent.
 *
 * Carries `operationCompleted` because the client's next move depends on it: a failed
 * *read* is safe to retry, a failed *write* whose outcome is unknown is not. The
 * message says which, because "something went wrong" after a payout request is the
 * worst possible thing to tell someone.
 */
export class UpstreamError extends AppError {
  readonly status = 502;
  readonly code = "upstream_failed";
  constructor(
    public readonly provider: string,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(message, { provider, ...context });
  }
}

/** 503 — deliberate. Maintenance, or a dependency we know is down. */
export class UnavailableError extends AppError {
  readonly status = 503;
  readonly code = "unavailable";
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message = "This service is briefly unavailable.") {
    super(message, { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Map anything thrown into a client-safe body plus the headers it needs.
 *
 * The `unknown` branch is the important one. Anything not deliberately modelled — a
 * `TypeError`, a Prisma error, a JSON parse failure — becomes an opaque 500. The
 * caller logs the original with full context; the client learns only that it failed.
 */
export function toErrorResponse(
  error: unknown,
  requestId: string,
): { status: number; body: ErrorBody; headers: Record<string, string> } {
  if (error instanceof AppError) {
    const body: ErrorBody = {
      error: { code: error.code, message: error.message, requestId },
    };

    if (error instanceof ValidationError) {
      body.error.fields = error.fields;
    }

    const headers: Record<string, string> = {};
    if (error instanceof RateLimitedError || error instanceof UnavailableError) {
      headers["Retry-After"] = String(error.retryAfterSeconds);
    }

    return { status: error.status, body, headers };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        // Deliberately says nothing. The detail is in the log under `requestId`.
        message: "Something went wrong at our end. Nothing you did caused it.",
        requestId,
      },
    },
    headers: {},
  };
}

/** True for errors worth waking someone for. A 404 is not; a 500 is. */
export function isAlertable(error: unknown): boolean {
  if (error instanceof AppError) return error.status >= 500;
  return true;
}
