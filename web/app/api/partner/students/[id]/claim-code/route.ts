/**
 * POST /api/partner/students/:id/claim-code — issue a code so the student can sign up
 *
 * Auth:  required (session with a partner record)
 * Authz: PARTNER_ISSUE_CLAIM_CODE
 *
 *   200  { claimCode }
 *   401  no session
 *   403  not a partner
 *   404  no such student, or not this partner's
 *   409  already claimed
 *   429  rate limited
 *
 * Returns the code rather than emailing it. The referrer is usually with the student or
 * on the phone to them, and an email to an address the agency typed is precisely the
 * weak link this design avoids — it would let whoever controls that address take over
 * the record.
 *
 * The service scopes the lookup to `session.partner.id`, so a partner cannot issue a
 * code for somebody else's student and take over their referral.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { ValidationError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { issueClaimCode } from "@/server/modules/claiming/claiming.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const POST = route({
  access: { kind: "permission", require: ["PARTNER_ISSUE_CLAIM_CODE"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const partner = requirePartner(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) throw new ValidationError({ id: ["That is not a valid student."] });

    return issueClaimCode(
      { studentId: parsed.data, scope: { partnerId: partner.id } },
      log,
    );
  },
});
