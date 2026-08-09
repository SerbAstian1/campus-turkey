/**
 * GET  /api/representative/students — the students this representative referred
 * POST /api/representative/students — refer a new one
 *
 * Auth:  required (session with a representative profile)
 * Authz: REPRESENTATIVE_READ_OWN_REFERRED_STUDENTS / REPRESENTATIVE_CREATE_STUDENT_REFERRAL
 *
 *   200  { items, nextCursor } | the created student
 *   400  validation failed
 *   401  no session
 *   403  not a representative, or the profile is not active
 *   429  rate limited
 *
 * **No endpoint here takes a representative id.** The scope comes from
 * `session.representative.id` and nowhere else, which is what makes "Representative A
 * cannot see Representative B's students" a property of the code rather than a rule
 * somebody has to remember per query. §89 tests it; this is why it holds.
 *
 * Deliberately not shared with `/api/partner/students`. §29 keeps the two permission
 * namespaces apart, and a shared handler branching on role is how they quietly rejoin.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireRepresentative } from "@/server/http/session";
import { db } from "@/server/lib/db";
import { ForbiddenError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuery = z.object({
  stage: z.enum(["ENQUIRY", "DOCUMENTS", "SUBMITTED", "OFFER", "VISA", "REGISTERED"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

const referBody = z.object({
  name: z.string().trim().min(2, "Enter the student's full name.").max(120),
  universitySlug: z.string().trim().min(1).max(120),
  universityName: z.string().trim().min(1).max(200),
  program: z.string().trim().min(1).max(200),
});

/** A suspended or closed representative may read their history and add nothing to it. */
function assertActive(status: string): void {
  if (status !== "ACTIVE") {
    throw new ForbiddenError(
      "Your representative account is not active. Your named contact can explain why.",
    );
  }
}

export const GET = route({
  access: { kind: "permission", require: ["REPRESENTATIVE_READ_OWN_REFERRED_STUDENTS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listQuery,
  handler: async ({ query, session }) => {
    const representative = requireRepresentative(session);

    const items = await db.student.findMany({
      where: {
        representativeId: representative.id,
        ...(query.stage ? { stage: query.stage } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        universityName: true,
        program: true,
        stage: true,
        updatedAt: true,
      },
    });

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;

    return { items: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
  },
});

export const POST = route({
  access: { kind: "permission", require: ["REPRESENTATIVE_CREATE_STUDENT_REFERRAL"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: referBody,
  handler: async ({ body, session, log }) => {
    const representative = requireRepresentative(session);
    assertActive(representative.status);

    const student = await db.student.create({
      data: {
        // `partnerId` is left unset. A CHECK constraint enforces that exactly one
        // referrer is present, so this record can never also be claimed by a partner.
        representativeId: representative.id,
        name: body.name,
        universitySlug: body.universitySlug,
        universityName: body.universityName,
        program: body.program,
      },
      select: { id: true, name: true, universityName: true, program: true, stage: true, updatedAt: true },
    });

    log.audit("representative.student_referred", {
      representativeId: representative.id,
      studentId: student.id,
    });

    return student;
  },
});
