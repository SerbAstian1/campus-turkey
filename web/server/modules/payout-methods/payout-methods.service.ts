/**
 * Payout methods — the vaulting flow.
 *
 * The model, restated from features/portal/payouts.ts because it is the reason this
 * module looks the way it does:
 *
 *   1. Ask the provider for a short-lived setup token, server-side.
 *   2. The partner enters their details in the PROVIDER's hosted field. Those details
 *      never touch our JavaScript and never reach this server.
 *   3. The provider hands back a reference. We exchange it for an opaque token and a
 *      masked label, and store only those.
 *
 * There is deliberately no function in this module that accepts an IBAN, an account
 * number or a wallet address. If one ever appears, the model has been abandoned and
 * this project has acquired data-protection obligations it was designed not to have.
 */

import { z } from "zod";
import type { Db } from "@/server/lib/db";
import { env } from "@/server/lib/config";
import { NotFoundError, UnprocessableError, UpstreamError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import type { PayoutMethodRow } from "@/server/types/api";
import * as repo from "./payout-methods.repository";

/* The database enum spelling. A type, not an array: nothing reads these at
   runtime — the only use is constraining the map below. */
type Kind = "BANK" | "WISE" | "STABLECOIN" | "MOBILE_MONEY";

/** The client sends the frontend spelling; the database uses the enum spelling. */
const KIND_FROM_DTO = {
  bank: "BANK",
  wise: "WISE",
  stablecoin: "STABLECOIN",
  "mobile-money": "MOBILE_MONEY",
} as const satisfies Record<string, Kind>;

export const setupTokenBody = z.object({
  kind: z.enum(["bank", "wise", "stablecoin", "mobile-money"]),
});

export const confirmMethodBody = z.object({
  /**
   * The provider's reference for the instrument the partner just entered. Opaque to
   * us, and bounded — an unbounded string forwarded to a third party is a request
   * -smuggling surface.
   */
  providerRef: z.string().trim().min(8).max(200),
  makeDefault: z.boolean().default(false),
});

export type SetupTokenBody = z.infer<typeof setupTokenBody>;
export type ConfirmMethodBody = z.infer<typeof confirmMethodBody>;

/**
 * The provider client.
 *
 * Every call states a timeout. The default for `fetch` is "until the platform gives
 * up", which on a serverless runtime means the function's whole budget is spent
 * waiting on someone else's outage.
 *
 * Not retried. Both operations mint or consume a single-use token, so a retry after an
 * ambiguous failure risks a second vaulted instrument for one entry — the same class of
 * bug the withdrawal idempotency key exists to prevent, and without a key to prevent it
 * the correct behaviour is to fail and let the partner start again.
 */
const PROVIDER_TIMEOUT_MS = 8_000;

async function callProvider<T>(
  path: string,
  init: RequestInit,
  log: RequestLogger,
): Promise<T> {
  if (env.PAYOUT_PROVIDER === "unconfigured" || !env.PAYOUT_API_KEY) {
    // Stated rather than assumed: this endpoint cannot work until the client answers
    // open question 3 (which payout provider). Returning a fake token would be worse
    // than refusing, because the partner would believe a method was added.
    throw new UnprocessableError(
      "payouts_unconfigured",
      "Adding a payout method is not available yet. Your named contact can arrange it directly.",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.PAYOUT_API_BASE ?? ""}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...init.headers,
        authorization: `Bearer ${env.PAYOUT_API_KEY}`,
        "content-type": "application/json",
      },
    });

    if (!response.ok) {
      // The provider's body may contain account data. It is never forwarded to the
      // client and never logged verbatim — only the status.
      log.error("payout provider rejected a request", {
        provider: env.PAYOUT_PROVIDER,
        status: response.status,
        path,
      });
      throw new UpstreamError(env.PAYOUT_PROVIDER, "We could not reach our payment provider. Please try again shortly.");
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof UpstreamError || error instanceof UnprocessableError) throw error;
    log.error("payout provider call failed", { provider: env.PAYOUT_PROVIDER, path, error });
    throw new UpstreamError(
      env.PAYOUT_PROVIDER,
      "We could not reach our payment provider. Please try again shortly.",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Step 1. Minted server-side; the browser never sees the API key that mints it. */
export async function createSetupToken(
  input: SetupTokenBody,
  partnerId: string,
  log: RequestLogger,
): Promise<{ token: string; expiresAt: string }> {
  const result = await callProvider<{ token: string; expires_at: string }>(
    "/v1/setup-tokens",
    {
      method: "POST",
      body: JSON.stringify({ kind: input.kind, reference: partnerId }),
    },
    log,
  );

  log.info("payout setup token minted", { partnerId, kind: input.kind });
  return { token: result.token, expiresAt: result.expires_at };
}

/** Step 3. Exchange the provider's reference for something safe to store. */
export async function confirmPayoutMethod(
  db: Db,
  partnerId: string,
  input: ConfirmMethodBody,
  log: RequestLogger,
): Promise<PayoutMethodRow> {
  const vaulted = await callProvider<{
    token: string;
    kind: keyof typeof KIND_FROM_DTO;
    label: string;
    masked_detail: string;
    speed: string;
    fee: string;
  }>(
    `/v1/instruments/${encodeURIComponent(input.providerRef)}`,
    { method: "GET" },
    log,
  );

  const kind = KIND_FROM_DTO[vaulted.kind];
  if (!kind) {
    throw new UpstreamError(env.PAYOUT_PROVIDER, "That payout method is not supported.");
  }

  const created = await repo.createPayoutMethod(db, {
    partnerId,
    kind,
    label: vaulted.label,
    maskedDetail: vaulted.masked_detail,
    providerToken: vaulted.token,
    providerName: env.PAYOUT_PROVIDER,
    speed: vaulted.speed,
    fee: vaulted.fee,
    makeDefault: input.makeDefault,
  });

  // The token is not in this log line, and `logger.redact` would remove it if it were.
  log.audit("payout_method.added", { partnerId, payoutMethodId: created.id, kind });

  return created;
}

export async function listMethods(db: Db, partnerId: string): Promise<PayoutMethodRow[]> {
  return repo.listPayoutMethods(db, partnerId);
}

/**
 * Archive a method.
 *
 * 404 rather than 403 when the id is not this partner's: the two are indistinguishable
 * to the caller by design, so the endpoint cannot confirm that a method id exists.
 */
export async function removeMethod(
  db: Db,
  partnerId: string,
  id: string,
  log: RequestLogger,
): Promise<void> {
  const archived = await repo.archivePayoutMethod(db, partnerId, id);
  if (!archived) throw new NotFoundError("We could not find that payout method.");
  log.audit("payout_method.archived", { partnerId, payoutMethodId: id });
}
