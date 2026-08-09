/**
 * The application workflow, walked exhaustively.
 *
 * Every one of the 16 x 16 `(from, to)` pairs is checked for every actor, rather than the
 * handful anybody would think to write by hand. The point is not coverage as a number: it
 * is that a transition nobody considered — SUBMITTED straight to ADMITTED, a rejection
 * reopened, a student approving their own visa — fails here rather than in production
 * against a real person's university place.
 */

import { describe, expect, it } from "vitest";
import {
  ALL_STATUSES,
  allowedTransitions,
  checkTransition,
  describeRefusal,
  isActive,
  isTerminal,
  timestampFor,
  type ApplicationActor,
  type ApplicationStatus,
} from "./application.state";

const ACTORS: ApplicationActor[] = ["STUDENT", "REFERRER", "STAFF", "SYSTEM"];
const TERMINAL: ApplicationStatus[] = ["ADMISSION_REJECTED", "VISA_REJECTED", "COMPLETED", "CANCELLED"];

/** A note is supplied everywhere it might be needed, so note-required never masks a
 *  different refusal in the exhaustive walk below. */
const allow = (from: ApplicationStatus, to: ApplicationStatus, actor: ApplicationActor) =>
  checkTransition(from, to, actor, "a reason").ok;

describe("the machine's shape", () => {
  it("declares sixteen statuses", () => {
    expect(ALL_STATUSES).toHaveLength(16);
  });

  it("names exactly the terminal states §50 describes", () => {
    expect(ALL_STATUSES.filter(isTerminal).sort()).toEqual([...TERMINAL].sort());
  });

  it("treats DRAFT as not yet active work", () => {
    expect(isActive("DRAFT")).toBe(false);
    expect(isActive("UNDER_REVIEW")).toBe(true);
    expect(isActive("COMPLETED")).toBe(false);
  });
});

describe("every (from, to, actor) triple", () => {
  it("refuses everything out of a terminal state", () => {
    for (const from of TERMINAL) {
      for (const to of ALL_STATUSES) {
        for (const actor of ACTORS) {
          expect(allow(from, to, actor), `${from} -> ${to} as ${actor}`).toBe(false);
        }
      }
    }
  });

  it("never allows a status to transition to itself", () => {
    for (const status of ALL_STATUSES) {
      for (const actor of ACTORS) {
        expect(allow(status, status, actor), `${status} -> itself as ${actor}`).toBe(false);
      }
    }
  });

  /**
   * §50's named example, and the reason this module exists. Checked as a class rather
   * than a single case: no non-terminal status may jump to a decision it has not been
   * through the process for.
   */
  it("refuses every jump that skips the university's decision", () => {
    const skipTargets: ApplicationStatus[] = ["ADMITTED", "VISA_APPROVED", "READY_FOR_TRAVEL", "COMPLETED"];

    for (const from of ALL_STATUSES) {
      for (const to of skipTargets) {
        // Only the one legitimate predecessor of each may reach it.
        const legitimate =
          (to === "ADMITTED" && from === "ADMISSION_PENDING") ||
          (to === "VISA_APPROVED" && from === "VISA_PROCESS") ||
          (to === "READY_FOR_TRAVEL" && from === "VISA_APPROVED") ||
          (to === "COMPLETED" && from === "READY_FOR_TRAVEL");

        for (const actor of ACTORS) {
          const permitted = allow(from, to, actor);
          if (!legitimate) {
            expect(permitted, `${from} -> ${to} as ${actor} must be refused`).toBe(false);
          }
        }
      }
    }
  });

  it("gives SUBMITTED exactly one forward path, and it is staff review", () => {
    expect(allowedTransitions("SUBMITTED", "STAFF").sort()).toEqual(["CANCELLED", "UNDER_REVIEW"]);
    expect(allow("SUBMITTED", "ADMITTED", "STAFF")).toBe(false);
  });
});

describe("who may do what", () => {
  it("lets an applicant submit their own draft", () => {
    expect(allow("DRAFT", "SUBMITTED", "STUDENT")).toBe(true);
    expect(allow("DRAFT", "SUBMITTED", "REFERRER")).toBe(true);
  });

  /**
   * The heart of §33 and §86: the outcome of an application is never the applicant's to
   * declare. A student who could set their own status could admit themselves.
   */
  it("lets neither a student nor a referrer declare any outcome", () => {
    const outcomes: ApplicationStatus[] = [
      "UNDER_REVIEW", "APPLICATION_PROCESSING", "UNIVERSITY_SUBMITTED", "ADMISSION_PENDING",
      "ADMITTED", "ADMISSION_REJECTED", "VISA_PROCESS", "VISA_APPROVED", "VISA_REJECTED",
      "READY_FOR_TRAVEL", "COMPLETED",
    ];

    for (const from of ALL_STATUSES) {
      for (const to of outcomes) {
        for (const actor of ["STUDENT", "REFERRER"] as ApplicationActor[]) {
          expect(allow(from, to, actor), `${actor} must not set ${to}`).toBe(false);
        }
      }
    }
  });

  it("lets an applicant cancel from anywhere still open", () => {
    for (const from of ALL_STATUSES.filter((s) => !isTerminal(s))) {
      expect(allow(from, "CANCELLED", "STUDENT"), `cancel from ${from}`).toBe(true);
    }
  });

  it("lets the document service move an upload into review, and nothing else", () => {
    expect(allow("DOCUMENTS_REQUIRED", "DOCUMENTS_REVIEW", "SYSTEM")).toBe(true);

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (from === "DOCUMENTS_REQUIRED" && to === "DOCUMENTS_REVIEW") continue;
        expect(allow(from, to, "SYSTEM"), `SYSTEM must not do ${from} -> ${to}`).toBe(false);
      }
    }
  });
});

describe("refusals that need a reason", () => {
  it.each([
    ["UNDER_REVIEW", "DOCUMENTS_REQUIRED"],
    ["ADMISSION_PENDING", "ADMISSION_REJECTED"],
    ["VISA_PROCESS", "VISA_REJECTED"],
  ] as [ApplicationStatus, ApplicationStatus][])(
    "%s to %s is refused without a note",
    (from, to) => {
      expect(checkTransition(from, to, "STAFF", null).ok).toBe(false);
      expect(checkTransition(from, to, "STAFF", "   ").ok).toBe(false);
      expect(checkTransition(from, to, "STAFF", "Transcript is illegible").ok).toBe(true);
    },
  );

  it("does not demand a reason for ordinary progress", () => {
    expect(checkTransition("SUBMITTED", "UNDER_REVIEW", "STAFF", null).ok).toBe(true);
    expect(checkTransition("ADMISSION_PENDING", "ADMITTED", "STAFF", null).ok).toBe(true);
  });
});

describe("the happy path is walkable end to end", () => {
  it("goes DRAFT to COMPLETED without a refusal", () => {
    const path: ApplicationStatus[] = [
      "DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPLICATION_PROCESSING",
      "UNIVERSITY_SUBMITTED", "ADMISSION_PENDING", "ADMITTED",
      "VISA_PROCESS", "VISA_APPROVED", "READY_FOR_TRAVEL", "COMPLETED",
    ];

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i]!;
      const to = path[i + 1]!;
      const actor: ApplicationActor = from === "DRAFT" ? "STUDENT" : "STAFF";
      expect(checkTransition(from, to, actor, "reason").ok, `${from} -> ${to}`).toBe(true);
    }
  });

  it("also walks the documents loop", () => {
    expect(allow("UNDER_REVIEW", "DOCUMENTS_REQUIRED", "STAFF")).toBe(true);
    expect(allow("DOCUMENTS_REQUIRED", "DOCUMENTS_REVIEW", "STUDENT")).toBe(true);
    expect(allow("DOCUMENTS_REVIEW", "DOCUMENTS_REQUIRED", "STAFF")).toBe(true);
    expect(allow("DOCUMENTS_REVIEW", "APPLICATION_PROCESSING", "STAFF")).toBe(true);
  });
});

describe("milestone timestamps", () => {
  it("dates the four §16 names and nothing else", () => {
    expect(timestampFor("SUBMITTED")).toBe("submittedAt");
    expect(timestampFor("UNDER_REVIEW")).toBe("reviewedAt");
    expect(timestampFor("ADMITTED")).toBe("approvedAt");
    expect(timestampFor("ADMISSION_REJECTED")).toBe("rejectedAt");
    expect(timestampFor("VISA_REJECTED")).toBe("rejectedAt");

    for (const status of ALL_STATUSES) {
      const column = timestampFor(status);
      if (column === null) continue;
      expect(["submittedAt", "reviewedAt", "approvedAt", "rejectedAt"]).toContain(column);
    }
  });

  it("dates nothing for a cancellation", () => {
    // Cancelling is not a rejection. Writing `rejectedAt` would report an applicant who
    // changed their mind as one the university refused.
    expect(timestampFor("CANCELLED")).toBeNull();
  });
});

describe("refusal messages", () => {
  it("reads as a sentence, not a code", () => {
    expect(describeRefusal({ code: "terminal", from: "COMPLETED" }))
      .toBe("This application is completed and cannot change again.");
    expect(describeRefusal({ code: "not-allowed", from: "SUBMITTED", to: "ADMITTED" }))
      .toBe("An application cannot go straight from submitted to admitted.");
  });
});
