/**
 * GET /api/documents/:id/download — a short-lived link to one document
 *
 * Auth:  required
 * Authz: READ_OWN_DOCUMENTS, plus ownership, checked in the service
 *
 *   200  { url, expiresInSeconds }
 *   401  no session
 *   403  not reachable by this caller
 *   404  no such document
 *   422  the upload never finished
 *   429  rate limited
 *
 * Returns a signed URL rather than the bytes. **There is no public object URL anywhere in
 * this system.** The bucket is private, and each link is minted per request and dies in
 * five minutes, so one copied out of a browser's network tab is useless by the time
 * anybody could share it.
 *
 * Every call is written to the audit log. These are passports, and who looked at one and
 * when is where an incident review starts.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { documentActor } from "@/server/http/actor";
import { ValidationError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { downloadUrl } from "@/server/modules/documents/documents.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const GET = route({
  access: { kind: "permission", require: ["READ_OWN_DOCUMENTS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  handler: async ({ params, session, log }) => {
    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) throw new ValidationError({ id: ["That is not a valid document."] });

    return downloadUrl({ documentId: parsed.data }, await documentActor(session), log);
  },
});
