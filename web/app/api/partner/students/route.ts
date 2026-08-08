/**
 * GET  /api/partner/students — list this partner's pipeline
 * POST /api/partner/students — add a student
 *
 * Auth:  required (session with a partner record)
 * Authz: scoped to `session.partner.id`; a partner id is never accepted from the request
 *
 * GET
 *   200  { items: PortalStudent[], nextCursor: string | null, pipeline: PipelineStage[] }
 *   400  invalid `limit`, `cursor` or `stage`
 *   401  no session
 *   403  session is not a partner
 *   429  rate limited
 *
 * POST
 *   200  PortalStudent
 *   400  validation failed
 *   401  no session
 *   403  session is not a partner, or the partner is suspended or closed
 *   429  rate limited — 30/min per user
 */

import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import {
  listStudents,
  createStudent,
  pipelineCounts,
  listStudentsQuery,
  createStudentBody,
} from "@/server/modules/students/students.service";
import { toStudentDto, toStageDto } from "@/server/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listStudentsQuery,
  handler: async ({ query, session }) => {
    const partner = requirePartner(session);

    const [page, pipeline] = await Promise.all([
      listStudents(db, partner.id, query),
      pipelineCounts(db, partner.id),
    ]);

    return {
      items: page.items.map(toStudentDto),
      nextCursor: page.nextCursor,
      // Shipped alongside the list because the dashboard renders both together; two
      // endpoints would mean two round trips for one screen.
      pipeline: pipeline.map((p) => ({ stage: toStageDto(p.stage), count: p.count })),
    };
  },
});

export const POST = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: createStudentBody,
  handler: async ({ body, session, log }) => {
    const partner = requirePartner(session);
    const student = await createStudent(db, partner.id, partner.status, body, log);
    return toStudentDto(student);
  },
});
