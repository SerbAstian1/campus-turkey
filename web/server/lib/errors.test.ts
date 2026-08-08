/**
 * Error mapping.
 *
 * The claim under test is a security claim: nothing thrown inside this application
 * reaches a client as anything but a modelled message. "Stack traces and database
 * errors never reach the client" is the kind of sentence that is true until someone
 * adds a `catch` block, which is why it has a test.
 */

import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  RateLimitedError,
  UpstreamError,
  UnavailableError,
  toErrorResponse,
  isAlertable,
} from "./errors";

const REQUEST_ID = "11111111-2222-3333-4444-555555555555";

describe("modelled errors map to their status", () => {
  const cases: Array<[AppError, number, string]> = [
    [new ValidationError({ email: ["Enter a valid email address."] }), 400, "validation_failed"],
    [new UnauthenticatedError(), 401, "unauthenticated"],
    [new ForbiddenError(), 403, "forbidden"],
    [new NotFoundError(), 404, "not_found"],
    [new ConflictError("insufficient", "Balance changed."), 409, "insufficient"],
    [new UnprocessableError("method-invalid", "Pick another."), 422, "method-invalid"],
    [new RateLimitedError(30), 429, "rate_limited"],
    [new UpstreamError("wise", "Provider unreachable."), 502, "upstream_failed"],
    [new UnavailableError(600), 503, "unavailable"],
  ];

  for (const [error, status, code] of cases) {
    it(`${error.name} -> ${status} ${code}`, () => {
      const result = toErrorResponse(error, REQUEST_ID);
      expect(result.status).toBe(status);
      expect(result.body.error.code).toBe(code);
      expect(result.body.error.requestId).toBe(REQUEST_ID);
    });
  }
});

describe("field errors", () => {
  it("are surfaced on a validation failure so the form can render them", () => {
    const error = new ValidationError({
      email: ["Enter a valid email address."],
      "payload.name": ["Enter your full name."],
    });
    const { body } = toErrorResponse(error, REQUEST_ID);
    expect(body.error.fields).toEqual({
      email: ["Enter a valid email address."],
      "payload.name": ["Enter your full name."],
    });
  });

  it("are absent on every other error type", () => {
    for (const error of [new ForbiddenError(), new NotFoundError(), new RateLimitedError(1)]) {
      expect(toErrorResponse(error, REQUEST_ID).body.error.fields).toBeUndefined();
    }
  });
});

describe("Retry-After", () => {
  it("accompanies a rate limit", () => {
    expect(toErrorResponse(new RateLimitedError(42), REQUEST_ID).headers["Retry-After"]).toBe("42");
  });

  it("accompanies a deliberate unavailability", () => {
    expect(toErrorResponse(new UnavailableError(600), REQUEST_ID).headers["Retry-After"]).toBe("600");
  });

  it("is absent where there is nothing useful to say about when to retry", () => {
    expect(toErrorResponse(new ForbiddenError(), REQUEST_ID).headers["Retry-After"]).toBeUndefined();
  });
});

describe("unmodelled throws become an opaque 500", () => {
  // The important test in this file. Everything here is something that can plausibly
  // be thrown by a dependency, and none of it may reach a client.

  const hostile: unknown[] = [
    new TypeError("Cannot read properties of undefined (reading 'partnerId')"),
    new Error(
      "Invalid `prisma.withdrawal.create()` invocation in /var/task/server/modules/withdrawals/withdrawals.service.ts:132",
    ),
    Object.assign(new Error("connect ECONNREFUSED 10.0.0.4:5432"), { code: "ECONNREFUSED" }),
    new SyntaxError("Unexpected token < in JSON at position 0"),
    "a bare string throw",
    { message: "an object throw", stack: "at handler (/var/task/app/api/route.ts:1:1)" },
    null,
    undefined,
  ];

  for (const [index, thrown] of hostile.entries()) {
    it(`case ${index} returns 500 with no detail`, () => {
      const { status, body } = toErrorResponse(thrown, REQUEST_ID);
      expect(status).toBe(500);
      expect(body.error.code).toBe("internal_error");

      const serialised = JSON.stringify(body);
      // No stack frames, no file paths, no ORM names, no host or port.
      expect(serialised).not.toMatch(/prisma|postgres|ECONNREFUSED|\/var\/task|at handler|5432|10\.0\.0/i);
      expect(serialised).not.toMatch(/stack/i);
      // The correlation id is the only thing that connects the user's report to the
      // log line that does have the detail.
      expect(body.error.requestId).toBe(REQUEST_ID);
    });
  }

  it("says nothing that blames the user", () => {
    const { body } = toErrorResponse(new Error("boom"), REQUEST_ID);
    expect(body.error.message).toMatch(/nothing you did caused it/i);
  });
});

describe("context stays server-side", () => {
  it("is carried on the error but never serialised into the response", () => {
    const error = new ConflictError("insufficient", "Balance changed.", {
      partnerId: "d1f0c2b4-0000-0000-0000-000000000000",
      availableMinor: 40000,
    });
    expect(error.context["availableMinor"]).toBe(40000);

    const serialised = JSON.stringify(toErrorResponse(error, REQUEST_ID).body);
    expect(serialised).not.toMatch(/40000|d1f0c2b4/);
  });
});

describe("isAlertable", () => {
  it("is false for the 4xx a normal user generates every day", () => {
    for (const error of [
      new ValidationError({}),
      new UnauthenticatedError(),
      new ForbiddenError(),
      new NotFoundError(),
      new ConflictError("x", "y"),
      new UnprocessableError("x", "y"),
      new RateLimitedError(1),
    ]) {
      expect(isAlertable(error)).toBe(false);
    }
  });

  it("is true for 5xx, modelled or not", () => {
    expect(isAlertable(new UpstreamError("wise", "down"))).toBe(true);
    expect(isAlertable(new UnavailableError(1))).toBe(true);
    expect(isAlertable(new TypeError("undefined is not a function"))).toBe(true);
    expect(isAlertable("something odd")).toBe(true);
  });
});
