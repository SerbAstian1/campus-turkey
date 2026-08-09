/**
 * POST /api/documents — ask for somewhere to upload a document
 *
 * Auth:  required
 * Authz: UPLOAD_OWN_DOCUMENTS, plus ownership of the application, checked in the service
 *
 *   200  { document, uploadUrl, expiresInSeconds }
 *   400  validation failed
 *   401  no session
 *   403  the application is not reachable by this caller
 *   404  no such application
 *   422  the file was refused by the rules in §83
 *   429  rate limited
 *
 * Returns a presigned URL rather than accepting the file. The bytes travel straight from
 * the browser to storage, so a passport never passes through this process's memory and is
 * never bounded by the 64KB request cap the rest of the API uses.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { documentActor } from "@/server/http/actor";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { requestUpload } from "@/server/modules/documents/documents.service";
import { MAX_BYTES } from "@/server/modules/documents/upload.rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({
  applicationId: z.string().uuid(),
  type: z.enum([
    "PASSPORT", "PHOTOGRAPH", "HIGH_SCHOOL_DIPLOMA", "HIGH_SCHOOL_TRANSCRIPT",
    "BACHELOR_DIPLOMA", "BACHELOR_TRANSCRIPT", "LANGUAGE_CERTIFICATE",
    "FINANCIAL_STATEMENT", "MEDICAL_REPORT", "OTHER",
  ]),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(120),
  /* Bounded here as well as in the rules. The rules give the applicant a readable
     refusal; this stops an absurd number reaching the service at all. */
  fileSize: z.number().int().positive().max(MAX_BYTES * 2),
});

export const POST = route({
  access: { kind: "permission", require: ["UPLOAD_OWN_DOCUMENTS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body,
  handler: async ({ body, session, log }) =>
    requestUpload(body, await documentActor(session), log),
});
