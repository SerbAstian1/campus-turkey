/**
 * Applications — business logic.
 *
 * No HTTP here. The routes turn these errors into status codes, which is what lets the
 * transition rules be tested against a real database without a server.
 *
 * §51 names the sequence a status change must follow:
 *
 *   validate authorization -> validate the transition -> update the application
 *   -> record history -> write an audit entry -> notify
 *
 * The first two happen before any write. **The remaining four happen inside one
 * transaction**, and all four roll back together. An application whose status moved
 * without a history row has a history that lies; one that notified a student and then
 * failed to commit has told them something untrue; one that wrote an audit entry for a
 * change that did not happen has a record nobody can trust.
 */

import { randomUUID } from "node:crypto";
import { serializable, db, type Db } from "@/server/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import { recordAudit } from "@/server/modules/audit/audit.service";
import { notify, notificationsForTransition } from "@/server/modules/notifications/notifications.service";
import {
  checkTransition,
  describeRefusal,
  timestampFor,
  type ApplicationActor,
  type ApplicationStatus,
} from "./application.state";

/**
 * A human-readable reference, from a sequence.
 *
 * Read aloud on the phone, so it is short and unambiguous rather than a uuid. The year
 * is in it because an application number without one is useless the moment there are two
 * intakes.
 */
async function nextApplicationNumber(tx: Db): Promise<string> {
  const [row] = await tx.$queryRaw<{ n: bigint }[]>`
    SELECT nextval('application_number_seq') AS n
  `;
  const year = new Date().getUTCFullYear();
  return `CT-${year}-${String(row?.n ?? 0).padStart(5, "0")}`;
}

export interface CreateApplicationInput {
  studentId: string;
  universityId?: string;
  programId?: string;
}

/**
 * Start an application for a student.
 *
 * Referral attribution is **copied from the student**, never taken from the caller. A
 * caller who could name the partner could credit a referral to somebody else, which is
 * the same class of bug as letting a partner id arrive in a request body.
 */
export async function createApplication(
  input: CreateApplicationInput,
  log: RequestLogger,
) {
  return serializable(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, partnerId: true, representativeId: true },
    });
    if (!student) throw new NotFoundError("We could not find that student.");

    /* One live application per student per university. Two people working the same case
       is how a student receives two conflicting emails about one place. */
    if (input.universityId) {
      const existing = await tx.application.findFirst({
        where: {
          studentId: student.id,
          universityId: input.universityId,
          status: { notIn: ["CANCELLED", "ADMISSION_REJECTED", "VISA_REJECTED", "COMPLETED"] },
        },
        select: { applicationNumber: true },
      });
      if (existing) {
        throw new ConflictError(
          "application_already_open",
          `There is already an open application for that university (${existing.applicationNumber}).`,
        );
      }
    }

    const applicationNumber = await nextApplicationNumber(tx);

    const application = await tx.application.create({
      data: {
        id: randomUUID(),
        applicationNumber,
        studentId: student.id,
        // Copied, not supplied. The XOR constraint holds because the student's own
        // referral columns are already exclusive.
        partnerId: student.partnerId,
        representativeId: student.representativeId,
        ...(input.universityId ? { universityId: input.universityId } : {}),
        ...(input.programId ? { programId: input.programId } : {}),
      },
      select: APPLICATION_FIELDS,
    });

    // The opening entry. Without it the history starts at the first change and the
    // record cannot say when the application began.
    await tx.applicationStatusHistory.create({
      data: {
        id: randomUUID(),
        applicationId: application.id,
        previousStatus: null,
        newStatus: "DRAFT",
        changedByUserId: null,
      },
    });

    log.audit("application.created", {
      applicationId: application.id,
      applicationNumber,
      studentId: student.id,
    });

    return application;
  });
}

export const APPLICATION_FIELDS = {
  id: true,
  applicationNumber: true,
  status: true,
  submittedAt: true,
  reviewedAt: true,
  approvedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, name: true, universityName: true, program: true } },
  university: { select: { slug: true, name: true, city: true } },
  program: { select: { name: true, degreeLevel: true } },
  partner: { select: { id: true, org: true } },
  representative: { select: { id: true, fullName: true } },
} as const;

export interface TransitionInput {
  applicationId: string;
  to: ApplicationStatus;
  actor: ApplicationActor;
  actorUserId: string | null;
  note: string | null;
}

/**
 * Move an application through the workflow.
 *
 * SERIALIZABLE because the read that decides whether a transition is legal and the write
 * that performs it must not be separated by somebody else's transition. Two staff opening
 * the same application and both pressing Admit would otherwise both read
 * ADMISSION_PENDING and both write, producing two history rows for one decision.
 */
export async function transitionApplication(
  input: TransitionInput,
  log: RequestLogger,
) {
  const result = await serializable(async (tx) => {
    const current = await tx.application.findUnique({
      where: { id: input.applicationId },
      select: { id: true, applicationNumber: true, status: true, studentId: true },
    });
    if (!current) throw new NotFoundError("We could not find that application.");

    const check = checkTransition(current.status, input.to, input.actor, input.note);
    if (!check.ok) {
      const message = describeRefusal(check.refusal);
      // A wrong actor is a permission problem and reads as 403; everything else is a
      // conflict with the application's current state and reads as 409.
      if (check.refusal.code === "wrong-actor") throw new ForbiddenError(message);
      throw new ConflictError(`transition_${check.refusal.code.replace(/-/g, "_")}`, message);
    }

    const stamp = timestampFor(input.to);

    const updated = await tx.application.update({
      // Compare-and-swap on the status we validated against. If somebody else moved it
      // between the read and this write, zero rows match and Prisma throws — which is
      // correct, and better than silently applying a decision to a different state.
      where: { id: current.id, status: current.status },
      data: {
        status: input.to,
        ...(stamp ? { [stamp]: new Date() } : {}),
      },
      select: APPLICATION_FIELDS,
    });

    await tx.applicationStatusHistory.create({
      data: {
        id: randomUUID(),
        applicationId: current.id,
        previousStatus: current.status,
        newStatus: input.to,
        changedByUserId: input.actorUserId,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      },
    });

    /* §51's remaining two steps, inside this transaction rather than after it.
       A notification written after a commit that then failed tells somebody their
       application moved when it did not, and an audit entry in the same position records
       something that never happened. Both roll back with the status if anything below
       throws. */
    await recordAudit(
      {
        action: "application.status_changed",
        entityType: "application",
        entityId: current.id,
        actorUserId: input.actorUserId,
        metadata: {
          applicationNumber: current.applicationNumber,
          from: current.status,
          to: input.to,
          actor: input.actor,
          ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        },
      },
      tx,
    );

    await notify(
      await notificationsForTransition({ applicationId: current.id, to: input.to }, tx),
      tx,
    );

    return { updated, previousStatus: current.status, studentId: current.studentId };
  });

  log.audit("application.transitioned", {
    applicationId: input.applicationId,
    applicationNumber: result.updated.applicationNumber,
    from: result.previousStatus,
    to: input.to,
    actor: input.actor,
    actorUserId: input.actorUserId,
  });

  return result.updated;
}

/**
 * Set or change the university and programme on a draft.
 *
 * Only while it is a DRAFT. After submission the choice is what Campus Turkey is acting
 * on, and changing it silently would mean staff working one application while the
 * applicant believes they applied somewhere else.
 */
export async function chooseUniversity(
  input: { applicationId: string; universityId: string; programId?: string },
  log: RequestLogger,
) {
  const application = await db.application.findUnique({
    where: { id: input.applicationId },
    select: { id: true, status: true },
  });
  if (!application) throw new NotFoundError("We could not find that application.");

  if (application.status !== "DRAFT") {
    throw new UnprocessableError(
      "application_not_draft",
      "This application has been submitted. Ask your contact to change the university for you.",
    );
  }

  const university = await db.university.findFirst({
    where: { id: input.universityId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!university) throw new NotFoundError("We could not find that university.");

  // The programme-belongs-to-university rule is enforced by a database trigger; this
  // check exists so the caller gets a sentence instead of a constraint violation.
  if (input.programId) {
    const program = await db.program.findFirst({
      where: { id: input.programId, universityId: input.universityId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!program) {
      throw new UnprocessableError(
        "program_not_at_university",
        "That programme is not offered by that university.",
      );
    }
  }

  const updated = await db.application.update({
    where: { id: application.id },
    data: {
      universityId: input.universityId,
      programId: input.programId ?? null,
    },
    select: APPLICATION_FIELDS,
  });

  log.audit("application.university_chosen", {
    applicationId: application.id,
    universityId: input.universityId,
  });

  return updated;
}

/** The history, oldest first. Read as a narrative, so it reads forwards. */
export async function applicationHistory(applicationId: string) {
  return db.applicationStatusHistory.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
    select: {
      previousStatus: true,
      newStatus: true,
      note: true,
      createdAt: true,
      changedBy: { select: { name: true, email: true } },
    },
  });
}
