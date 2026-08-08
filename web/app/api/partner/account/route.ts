/**
 * GET /api/partner/account — who this partner is
 *
 * Auth:  required (session with a partner record)
 * Authz: returns the session's own partner and nothing else. There is no id parameter,
 *        so there is no version of this endpoint that could return someone else's.
 *
 *   200  PortalAccount (see src/content/types.ts)
 *   401  no session
 *   403  session is not a partner
 *   429  rate limited
 *
 * Added during the frontend wiring: the portal header renders the organisation, the
 * territory and the named Campus Turkey contact, and every other endpoint returned
 * money or records rather than identity.
 */

import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { NotFoundError } from "@/server/lib/errors";
import type { PortalAccount } from "@contracts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerRead,
  handler: async ({ session }): Promise<PortalAccount> => {
    const partner = requirePartner(session);

    const record = await db.partner.findUnique({
      where: { id: partner.id },
      select: {
        org: true, person: true, role: true, territory: true,
        managerName: true, managerRole: true, since: true,
      },
    });
    if (!record) throw new NotFoundError("We could not find that account.");

    return {
      org: record.org,
      person: record.person,
      role: record.role,
      territory: record.territory,
      // The year alone: the portal renders "Partner since 2024", and a full date would
      // wrap the header on a phone.
      since: String(record.since.getUTCFullYear()),
      manager: record.managerName,
      managerRole: record.managerRole,
    };
  },
});
