/**
 * GET /api/partner/wallet — balance, minimum, and connected payout methods
 *
 * Auth:  required (session with a partner record)
 * Authz: scoped to `session.partner.id`; no partner id is accepted from the request
 *
 *   200  Wallet (see app/src/content/types.ts)
 *   401  no session
 *   403  session is not a partner
 *   429  rate limited — 120/min per user
 *   500  unexpected
 *
 * `options` — the payout rails on offer before a partner has connected one — is static
 * marketing content, not data. It is served from the content layer rather than a table
 * so that adding a rail is a content change, not a migration.
 */

import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { getWallet } from "@/server/modules/wallet/wallet.service";
import { toWalletDto } from "@/server/types/api";
import { PAYOUT_OPTIONS } from "@/server/modules/payout-methods/payout-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerRead,
  handler: async ({ session, log }) => {
    const partner = requirePartner(session);
    const wallet = await getWallet(db, partner.id, log);

    return toWalletDto({
      balance: wallet.balance,
      currency: wallet.currency,
      minimumMinor: wallet.minimumMinor,
      note: wallet.note,
      methods: wallet.methods,
      options: PAYOUT_OPTIONS,
    });
  },
});
