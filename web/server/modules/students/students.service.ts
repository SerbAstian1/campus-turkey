/**
 * Students — the partner's pipeline.
 *
 * Every query is scoped by `partnerId` in the `where` clause, taken from the session
 * and never from the request. There is no function in this module that can return
 * another partner's student, which is a stronger guarantee than a check that could be
 * forgotten by the next caller.
 */

import { z } from "zod";
import type { Db } from "@/server/lib/db";
import { ForbiddenError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import type { StudentRow } from "@/server/types/api";

export const STAGES = [
  "ENQUIRY",
  "DOCUMENTS",
  "SUBMITTED",
  "OFFER",
  "VISA",
  "REGISTERED",
] as const;

export const listStudentsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
  stage: z.enum(STAGES).optional(),
});

export type ListStudentsQuery = z.infer<typeof listStudentsQuery>;

export const createStudentBody = z.object({
  name: z.string().trim().min(2, "Enter the student's full name.").max(120),
  universitySlug: z.string().trim().min(1).max(120),
  universityName: z.string().trim().min(1).max(200),
  program: z.string().trim().min(1, "Enter the programme.").max(200),
});

export type CreateStudentBody = z.infer<typeof createStudentBody>;

/**
 * List a partner's students, newest activity first.
 *
 * The commission total per student is aggregated in the same query via a relation
 * `select`, not by a second query per row. That is the N+1 this endpoint would
 * otherwise have: twenty students would become twenty-one queries, and a partner with
 * a real pipeline would feel it.
 */
export async function listStudents(
  db: Db,
  partnerId: string,
  options: ListStudentsQuery,
): Promise<{ items: StudentRow[]; nextCursor: string | null }> {
  const rows = await db.student.findMany({
    where: { partnerId, ...(options.stage ? { stage: options.stage } : {}) },
    select: {
      id: true,
      name: true,
      universityName: true,
      program: true,
      stage: true,
      updatedAt: true,
      commissions: {
        // Only confirmed commissions count toward the figure shown beside a student.
        // Including pending ones would show money the partner cannot withdraw next to a
        // name, which is the most confusing possible place to put it.
        where: { state: "CONFIRMED" },
        select: { amountMinor: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, options.limit);
  const nextCursor = rows.length > options.limit ? (page[page.length - 1]?.id ?? null) : null;

  return {
    items: page.map((row) => ({
      id: row.id,
      name: row.name,
      universityName: row.universityName,
      program: row.program,
      stage: row.stage,
      updatedAt: row.updatedAt,
      commissionMinor: row.commissions.reduce((total, c) => total + c.amountMinor, 0),
    })),
    nextCursor,
  };
}

/** The pipeline counts. One grouped query, not one query per stage. */
export async function pipelineCounts(
  db: Db,
  partnerId: string,
): Promise<Array<{ stage: (typeof STAGES)[number]; count: number }>> {
  const grouped = await db.student.groupBy({
    by: ["stage"],
    where: { partnerId },
    _count: { _all: true },
  });

  const counts = new Map(grouped.map((g) => [g.stage, g._count._all]));
  // Every stage is returned, including the empty ones — a pipeline strip with gaps in
  // it reads as a rendering bug rather than as "nobody is at that stage".
  return STAGES.map((stage) => ({ stage, count: counts.get(stage) ?? 0 }));
}

export async function createStudent(
  db: Db,
  partnerId: string,
  partnerStatus: "ACTIVE" | "SUSPENDED" | "CLOSED",
  input: CreateStudentBody,
  log: RequestLogger,
): Promise<StudentRow> {
  if (partnerStatus !== "ACTIVE") {
    throw new ForbiddenError("This account cannot add students at the moment.");
  }

  const created = await db.student.create({
    data: {
      partnerId,
      name: input.name,
      universitySlug: input.universitySlug,
      universityName: input.universityName,
      program: input.program,
      stage: "ENQUIRY",
    },
    select: {
      id: true,
      name: true,
      universityName: true,
      program: true,
      stage: true,
      updatedAt: true,
    },
  });

  log.info("student created", { studentId: created.id, partnerId });

  return { ...created, commissionMinor: 0 };
}
