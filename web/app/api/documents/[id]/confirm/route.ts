/**
 * POST /api/documents/:id/confirm — the upload finished
 *
 * Auth:  required
 * Authz: UPLOAD_OWN_DOCUMENTS, plus ownership, checked in the service
 *
 *   200  { ok: true }
 *   401  no session
 *   403  not reachable by this caller
 *   404  no such document
 *   429  rate limited
 *
 * Until this runs the document is invisible to every list and to the review queue, which
 * is what stops staff opening a file that is half written or was never sent at all.
 *
 * Idempotent: a browser that retries has already finished, and saying so twice is not an
 * error worth reporting to somebody who just uploaded a passport.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { documentActor } from "@/server/http/actor";
import { ValidationError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { confirmUpload } from "@/server/modules/documents/documents.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const POST = route({
  access: { kind: "permission", require: ["UPLOAD_OWN_DOCUMENTS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) throw new ValidationError({ id: ["That is not a valid document."] });

    return confirmUpload({ documentId: parsed.data }, await documentActor(session), log);
  },
});
