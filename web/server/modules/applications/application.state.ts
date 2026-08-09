/**
 * The application workflow — brief §50.
 *
 * Pure. No database, no HTTP, no clock. That is what lets every one of the 256 possible
 * `(from, to)` pairs be tested exhaustively rather than the handful somebody remembered,
 * which is the same arrangement `withdrawal.state.ts` has and for the same reason: this
 * decides what happens to a person's university place.
 *
 * §50 states the rule this file exists to enforce: *do not allow the frontend to
 * arbitrarily change SUBMITTED to ADMITTED*. A status column with an open setter is a
 * status column that eventually gets set by whoever calls the endpoint.
 */

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "DOCUMENTS_REQUIRED"
  | "DOCUMENTS_REVIEW"
  | "APPLICATION_PROCESSING"
  | "UNIVERSITY_SUBMITTED"
  | "ADMISSION_PENDING"
  | "ADMITTED"
  | "ADMISSION_REJECTED"
  | "VISA_PROCESS"
  | "VISA_APPROVED"
  | "VISA_REJECTED"
  | "READY_FOR_TRAVEL"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Who may drive a transition.
 *
 * `STUDENT` and `REFERRER` exist so the table can say what they *cannot* do, which is
 * almost everything. A student may submit their own draft and cancel; a partner or
 * representative may do the same on behalf of someone they referred. Every other
 * transition is Campus Turkey's, because every other transition is a claim about what a
 * university or a consulate has decided.
 */
export type ApplicationActor = "STUDENT" | "REFERRER" | "STAFF" | "SYSTEM";

interface Transition {
  readonly to: ApplicationStatus;
  readonly by: readonly ApplicationActor[];
  /** A refusal has to say why: it is the one thing the applicant will ask about. */
  readonly noteRequired: boolean;
}

/**
 * The whole machine, in one table.
 *
 * Read down the left column for "where can this go next". Anything absent is refused,
 * which is what makes SUBMITTED to ADMITTED impossible rather than merely discouraged.
 *
 * `CANCELLED` is reachable from every non-terminal state: an applicant can withdraw at
 * any point up to travel, and a system that cannot record that ends up with abandoned
 * applications sitting in a queue forever.
 */
const TRANSITIONS: Readonly<Record<ApplicationStatus, readonly Transition[]>> = {
  DRAFT: [
    // The applicant's own act. Staff may also submit on their behalf, which is what
    // happens when an agency fills the form in during a phone call.
    { to: "SUBMITTED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  SUBMITTED: [
    { to: "UNDER_REVIEW", by: ["STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  UNDER_REVIEW: [
    { to: "DOCUMENTS_REQUIRED", by: ["STAFF"], noteRequired: true },
    { to: "APPLICATION_PROCESSING", by: ["STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  DOCUMENTS_REQUIRED: [
    // The applicant uploads, and the act of uploading moves it on. `SYSTEM` is the
    // document service, not a person.
    { to: "DOCUMENTS_REVIEW", by: ["STUDENT", "REFERRER", "STAFF", "SYSTEM"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  DOCUMENTS_REVIEW: [
    // Back round the loop when something is wrong with what was uploaded.
    { to: "DOCUMENTS_REQUIRED", by: ["STAFF"], noteRequired: true },
    { to: "APPLICATION_PROCESSING", by: ["STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  APPLICATION_PROCESSING: [
    { to: "UNIVERSITY_SUBMITTED", by: ["STAFF"], noteRequired: false },
    { to: "DOCUMENTS_REQUIRED", by: ["STAFF"], noteRequired: true },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  UNIVERSITY_SUBMITTED: [
    { to: "ADMISSION_PENDING", by: ["STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  ADMISSION_PENDING: [
    // The university's decision, recorded. Neither outcome is Campus Turkey's to invent,
    // which is why both require staff to have heard something.
    { to: "ADMITTED", by: ["STAFF"], noteRequired: false },
    { to: "ADMISSION_REJECTED", by: ["STAFF"], noteRequired: true },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  ADMITTED: [
    { to: "VISA_PROCESS", by: ["STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  VISA_PROCESS: [
    { to: "VISA_APPROVED", by: ["STAFF"], noteRequired: false },
    { to: "VISA_REJECTED", by: ["STAFF"], noteRequired: true },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  VISA_APPROVED: [
    { to: "READY_FOR_TRAVEL", by: ["STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],
  READY_FOR_TRAVEL: [
    { to: "COMPLETED", by: ["STAFF"], noteRequired: false },
    { to: "CANCELLED", by: ["STUDENT", "REFERRER", "STAFF"], noteRequired: false },
  ],

  /* Terminal. A rejected admission is not reopened — the applicant applies again, which
     is a new application with its own history. Reopening would overwrite the record of
     what the university actually said. */
  ADMISSION_REJECTED: [],
  VISA_REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export function isTerminal(status: ApplicationStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Statuses that mean the application is live work rather than finished or abandoned. */
export function isActive(status: ApplicationStatus): boolean {
  return !isTerminal(status) && status !== "DRAFT";
}

export type TransitionRefusal =
  | { code: "terminal"; from: ApplicationStatus }
  | { code: "not-allowed"; from: ApplicationStatus; to: ApplicationStatus }
  | { code: "wrong-actor"; to: ApplicationStatus; permitted: readonly ApplicationActor[] }
  | { code: "note-required"; to: ApplicationStatus };

export type TransitionCheck =
  | { ok: true }
  | { ok: false; refusal: TransitionRefusal };

/**
 * May `actor` move an application from `from` to `to`?
 *
 * The order of the checks is the order a reader needs them: is this finished, is that a
 * real edge, are you allowed to walk it, and did you say why.
 */
export function checkTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: ApplicationActor,
  note: string | null,
): TransitionCheck {
  if (isTerminal(from)) {
    return { ok: false, refusal: { code: "terminal", from } };
  }

  const transition = TRANSITIONS[from].find((t) => t.to === to);
  if (!transition) {
    return { ok: false, refusal: { code: "not-allowed", from, to } };
  }

  if (!transition.by.includes(actor)) {
    return { ok: false, refusal: { code: "wrong-actor", to, permitted: transition.by } };
  }

  if (transition.noteRequired && !note?.trim()) {
    return { ok: false, refusal: { code: "note-required", to } };
  }

  return { ok: true };
}

/** What this actor could do next. Drives which buttons a portal offers — never which
 *  ones it enforces, which is this module's job on the server. */
export function allowedTransitions(
  from: ApplicationStatus,
  actor: ApplicationActor,
): ApplicationStatus[] {
  return TRANSITIONS[from].filter((t) => t.by.includes(actor)).map((t) => t.to);
}

/** A refusal in the reader's terms. Staff see these; they should not read like a dump. */
export function describeRefusal(refusal: TransitionRefusal): string {
  switch (refusal.code) {
    case "terminal":
      return `This application is ${refusal.from.toLowerCase().replace(/_/g, " ")} and cannot change again.`;
    case "not-allowed":
      return `An application cannot go straight from ${refusal.from.toLowerCase().replace(/_/g, " ")} to ${refusal.to.toLowerCase().replace(/_/g, " ")}.`;
    case "wrong-actor":
      return "You do not have permission to make that change.";
    case "note-required":
      return "Add a reason. The applicant is shown exactly this.";
  }
}

/**
 * Which timestamp column a transition sets.
 *
 * `Application` carries four dated milestones (§16). Deriving them from history on every
 * read would mean a scan per row; setting them here keeps them queryable and keeps the
 * rule in one place.
 */
export function timestampFor(to: ApplicationStatus): "submittedAt" | "reviewedAt" | "approvedAt" | "rejectedAt" | null {
  switch (to) {
    case "SUBMITTED": return "submittedAt";
    case "UNDER_REVIEW": return "reviewedAt";
    case "ADMITTED": return "approvedAt";
    case "ADMISSION_REJECTED":
    case "VISA_REJECTED": return "rejectedAt";
    default: return null;
  }
}

/** Every status, for exhaustive tests and for building filter lists. */
export const ALL_STATUSES = Object.keys(TRANSITIONS) as ApplicationStatus[];
