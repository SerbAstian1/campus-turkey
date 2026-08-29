/**
 * Which database failures are worth trying again.
 *
 * This decision had no test, and the gap cost a publish. `withTransientRetry` exists so
 * that a momentary connection problem does not end a build that renders 1,348 pages, each
 * of which reads from Postgres. It worked for the case it was written against, a
 * suspended Neon compute refusing the first connection, and not for the case that
 * actually happened next.
 *
 * A build failed at page 1,011 of 1,348 with `Error opening a TLS connection: An existing
 * connection was forcibly closed by the remote host`. That is a connection that opened
 * and was then dropped, rather than one that never opened, and its message contains none
 * of the three phrases the classifier matched. So it was treated as permanent, thrown,
 * and the whole publish died. The database answered normally a few seconds later and the
 * next attempt succeeded, which is the signature of exactly the class of error this was
 * built to absorb.
 *
 * The two directions are asymmetric and both are pinned below. Missing a transient error
 * costs a failed deploy and a confusing hunt for a fault that has already gone. Treating
 * a *permanent* error as transient is worse in a quieter way: a wrong `DATABASE_URL`
 * would retry five times over fifteen seconds and then fail anyway, having buried the one
 * message that said what was actually wrong.
 */

import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { isTransientConnectionError } from "./db";

/** Prisma's shape for a connection that never opened. It carries no error code. */
function initialisationError(message: string) {
  return new Prisma.PrismaClientInitializationError(message, "test");
}

describe("connections that never opened", () => {
  it("recognises a suspended compute refusing the first connection", () => {
    expect(
      isTransientConnectionError(
        initialisationError("Can't reach database server at `ep-cold-band.neon.tech:5432`"),
      ),
    ).toBe(true);
  });

  it("recognises a refusal and a timeout", () => {
    expect(isTransientConnectionError(initialisationError("Connection refused"))).toBe(true);
    expect(isTransientConnectionError(initialisationError("Operation timed out"))).toBe(true);
  });
});

describe("connections that opened and were then lost", () => {
  /**
   * The exact message from the build that failed at page 1,011. Kept verbatim rather
   * than paraphrased: the whole defect was a message that did not match, so a tidied-up
   * version of it would test the tidying rather than the thing.
   */
  it("recognises the dropped TLS connection that ended a real build", () => {
    expect(
      isTransientConnectionError(
        initialisationError(
          "Error opening a TLS connection: An existing connection was forcibly closed by the remote host. (os error 10054)",
        ),
      ),
    ).toBe(true);
  });

  it("recognises the other ways a live connection dies", () => {
    for (const message of [
      "Connection reset by peer",
      "server closed the connection unexpectedly",
      "Broken pipe (os error 32)",
      "the connection closed while reading",
    ]) {
      expect(isTransientConnectionError(initialisationError(message)), message).toBe(true);
    }
  });
});

describe("failures that must not be retried", () => {
  it("does not retry a malformed connection string", () => {
    /*
     * Same class, permanent cause. Retrying spends fifteen seconds proving the URL is
     * still wrong, and pushes the message that explains it further up the log.
     */
    expect(
      isTransientConnectionError(
        initialisationError(
          "Error validating datasource `db`: the URL must start with the protocol `postgresql://`",
        ),
      ),
    ).toBe(false);
  });

  it("does not retry an authentication failure", () => {
    expect(
      isTransientConnectionError(
        initialisationError("Authentication failed against database server, the provided credentials are invalid"),
      ),
    ).toBe(false);
  });

  it("does not retry an ordinary query error or an arbitrary throw", () => {
    expect(isTransientConnectionError(new Error("boom"))).toBe(false);
    expect(isTransientConnectionError(null)).toBe(false);
    expect(isTransientConnectionError(undefined)).toBe(false);
    expect(isTransientConnectionError("P1001")).toBe(false);
  });
});

describe("errors that carry a code", () => {
  it("retries the connection codes regardless of message", () => {
    for (const code of ["P1001", "P1008", "P1017", "P2024"]) {
      const error = new Prisma.PrismaClientKnownRequestError("unhelpful", {
        code,
        clientVersion: "test",
      });
      expect(isTransientConnectionError(error), code).toBe(true);
    }
  });

  it("does not retry a unique violation or a missing row", () => {
    for (const code of ["P2002", "P2025"]) {
      const error = new Prisma.PrismaClientKnownRequestError("refused", {
        code,
        clientVersion: "test",
      });
      expect(isTransientConnectionError(error), code).toBe(false);
    }
  });
});
