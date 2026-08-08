/**
 * Withdrawal input schemas.
 *
 * Validation happens once, here, at the boundary. Everything inward trusts the typed
 * value — a service re-checking what the schema already guaranteed means the boundary
 * is not doing its job and there are now two places for the rule to drift.
 */

import { z } from "zod";
import { MAX_MINOR } from "@/server/lib/money";

/** UUID v4, which is what `crypto.randomUUID()` in the client produces. */
const uuid = z.string().uuid();

export const requestWithdrawalBody = z.object({
  /**
   * Minor units, integer, positive, within the storable range. The client posts this
   * directly — see `WithdrawalRequest` in features/portal/withdrawals.ts.
   *
   * `.int()` is the load-bearing rule. Without it, `10.5` cents arrives, gets stored by
   * Postgres as a rounded integer, and the number the partner agreed to is not the
   * number in the database.
   */
  amountMinor: z
    .number()
    .int("Enter a whole amount.")
    .positive("Enter an amount greater than zero.")
    .max(MAX_MINOR, "That amount is too large."),

  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code."),

  payoutMethodId: uuid,
});

export type RequestWithdrawalBody = z.infer<typeof requestWithdrawalBody>;

/**
 * The idempotency key arrives as a header, not in the body — that is what the client
 * sends. It is validated with the same rigour as a body field: an unbounded string
 * here becomes an unbounded index entry, and a caller who varies it per retry defeats
 * the guarantee it exists to provide.
 */
export const idempotencyKeyHeader = z
  .string()
  .uuid("The idempotency key must be a UUID.");

export const listWithdrawalsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: uuid.optional(),
});

export type ListWithdrawalsQuery = z.infer<typeof listWithdrawalsQuery>;

/** Staff-only. Drives the state machine. */
export const transitionWithdrawalBody = z.object({
  to: z.enum(["APPROVED", "PROCESSING", "PAID", "REJECTED"]),
  /** Required on a rejection; the state machine enforces that, not this schema. */
  note: z.string().trim().min(1).max(500).optional(),
  providerRef: z.string().trim().min(1).max(200).optional(),
});

export type TransitionWithdrawalBody = z.infer<typeof transitionWithdrawalBody>;
