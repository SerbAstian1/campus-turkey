/**
 * Claiming a referred record — brief §10.
 *
 * Its own module rather than an addition to `students.service.ts`. That one answers
 * "what is in this partner's pipeline" and scopes every query by `partnerId`; this one
 * answers "is this person the student named in that record" and scopes by a code the
 * student holds. Two different questions with two different scopes, and putting them in
 * one file would leave a partner-scoped helper one autocomplete away from a
 * student-scoped one.
 *
 * A referred record and an account are different things, and the moment they meet is
 * here. An agency creates a `Student` when they refer somebody; that person later
 * receives a claim code, signs up, and the two are joined.
 *
 * The alternative designs both fail in ways worth naming. Creating an account at referral
 * time gives every referred person a dormant login they never asked for, on an address
 * the agency typed. Matching on email alone lets anybody who guesses an address take over
 * a stranger's application. A single-use code held by the student is what makes the claim
 * an act by the person it concerns.
 */

import { randomBytes, randomUUID } from "node:crypto";
import { db, serializable } from "@/server/lib/db";
import { ConflictError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";

/**
 * A claim code.
 *
 * Eight characters from an alphabet with no `0/O` or `1/I/l`, because this is read off a
 * screen and typed by somebody who may be doing it in their third language. 32^8 is about
 * a thousand billion combinations, and the code is single-use and scoped to one record,
 * so guessing is not a realistic attack even before rate limiting.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateClaimCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * Issue a claim code for a referred student.
 *
 * Called by the referrer's portal. Returns the code so it can be shown once; it is not
 * emailed here, because the referrer is usually with the student or on the phone to them,
 * and an email to an address the agency typed is exactly the weak link this design avoids.
 */
export async function issueClaimCode(
  input: { studentId: string; scope: { partnerId?: string; representativeId?: string } },
  log: RequestLogger,
): Promise<{ claimCode: string }> {
  const student = await db.student.findFirst({
    // Scoped by the caller's own id. A referrer cannot issue a code for somebody else's
    // student, which would let them take over that referral.
    where: {
      id: input.studentId,
      ...(input.scope.partnerId ? { partnerId: input.scope.partnerId } : {}),
      ...(input.scope.representativeId ? { representativeId: input.scope.representativeId } : {}),
    },
    select: { id: true, profileId: true, claimCode: true },
  });
  if (!student) throw new NotFoundError("We could not find that student.");

  if (student.profileId) {
    throw new ConflictError(
      "already_claimed",
      "This student has already created their account.",
    );
  }

  // Reissuing replaces the previous code rather than adding a second, so an old one
  // handed out and forgotten stops working.
  const claimCode = generateClaimCode();
  await db.student.update({ where: { id: student.id }, data: { claimCode } });

  log.audit("student.claim_code_issued", { studentId: student.id });

  return { claimCode };
}

export interface ClaimInput {
  claimCode: string;
  userId: string;
  firstName: string;
  lastName: string;
  nationality: string;
  countryOfResidence: string;
  phone?: string;
}

/**
 * Claim a referred record, creating the student's profile.
 *
 * One transaction: the profile is created, the record is joined to it, and the code is
 * consumed. A CHECK constraint refuses a row that is both claimed and still carrying a
 * live code, so a partial failure cannot leave a code that a second person could use.
 */
export async function claimStudentRecord(input: ClaimInput, log: RequestLogger) {
  return serializable(async (tx) => {
    const student = await tx.student.findUnique({
      where: { claimCode: input.claimCode.trim().toUpperCase() },
      select: { id: true, name: true, profileId: true },
    });

    // Deliberately the same message for an unknown code and a consumed one. Telling the
    // difference confirms that a code was once valid, which is information a guesser
    // would use to know they are close.
    if (!student || student.profileId) {
      throw new UnprocessableError(
        "invalid_claim_code",
        "That code is not valid. Ask your agency or representative for a new one.",
      );
    }

    const existingProfile = await tx.studentProfile.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    });

    /* A second claim by somebody who already has a profile attaches the new record to
       their existing account rather than creating a second one. That is the case where
       two agencies referred the same person before either reached them. */
    const profile = existingProfile ?? await tx.studentProfile.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        nationality: input.nationality,
        countryOfResidence: input.countryOfResidence,
        ...(input.phone ? { phone: input.phone } : {}),
      },
      select: { id: true },
    });

    await tx.student.update({
      where: { id: student.id },
      // The code is cleared in the same statement that sets the profile, which is what
      // the CHECK constraint requires and what makes the claim single-use.
      data: { profileId: profile.id, claimCode: null },
    });

    log.audit("student.record_claimed", {
      studentId: student.id,
      profileId: profile.id,
      userId: input.userId,
    });

    return { profileId: profile.id, studentId: student.id, studentName: student.name };
  });
}

/**
 * Everything a signed-in student may see about themselves.
 *
 * Scoped to their profile, never to an id from the request. §27 confines a student to
 * their own records, and this is the query that makes that true rather than promised.
 */
export async function studentDashboard(profileId: string) {
  const [profile, applications] = await Promise.all([
    db.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        firstName: true, lastName: true, phone: true, nationality: true,
        countryOfResidence: true, dateOfBirth: true, address: true,
      },
    }),
    db.application.findMany({
      where: { student: { profileId } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        applicationNumber: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        university: { select: { slug: true, name: true, city: true } },
        program: { select: { name: true, degreeLevel: true } },
        // Internal notes and staff conversations are absent by construction: they are
        // not in this select, and §27 says a student may never read them.
      },
    }),
  ]);

  return { profile, applications };
}
