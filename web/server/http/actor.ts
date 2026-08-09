/**
 * Turning a session into the shape the document module needs.
 *
 * One function, used by every document endpoint, so that "who is asking" is assembled the
 * same way each time. A per-endpoint version of this is how one of them ends up omitting
 * `representativeId` and quietly refusing every representative — a bug that looks like a
 * permissions problem and is actually a missing field.
 */

import { db } from "@/server/lib/db";
import type { DocumentActor } from "@/server/modules/documents/documents.service";
import { requireUser, type Session } from "./session";

export async function documentActor(session: Session): Promise<DocumentActor> {
  const user = requireUser(session);

  /* The student profile is not carried on the session. Only these endpoints need it, and
     loading it for every request to serve a handful would be a query the other ninety
     percent discard. */
  const profile =
    user.role === "STUDENT"
      ? await db.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
      : null;

  return {
    userId: user.id,
    principal: { role: user.role, status: user.status, department: user.department },
    studentProfileId: profile?.id ?? null,
    partnerId: session.partner?.id ?? null,
    representativeId: session.representative?.id ?? null,
  };
}
