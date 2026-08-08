/**
 * Input schemas for the staff console.
 *
 * Staff endpoints are validated exactly as hard as public ones. A privileged caller is
 * still an untrusted caller — an admin with a slipped decimal point is one of the more
 * likely ways this system loses money, and "they're staff" is not a validation strategy.
 */

import { z } from "zod";
import { MAX_MINOR } from "@/server/lib/money";

const uuid = z.string().uuid();

export const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: uuid.optional(),
});

// ------------------------------------------------------------------ withdrawals

export const withdrawalQueueQuery = listQuery.extend({
  status: z.enum(["REQUESTED", "APPROVED", "PROCESSING", "PAID", "REJECTED"]).optional(),
  partnerId: uuid.optional(),
});

export const transitionWithdrawalBody = z.object({
  to: z.enum(["APPROVED", "PROCESSING", "PAID", "REJECTED"]),
  /** Required on a rejection. The state machine enforces that, not this schema. */
  note: z.string().trim().min(1).max(500).optional(),
  /** The payout provider's reference. Required once the money is moving. */
  providerRef: z.string().trim().min(1).max(200).optional(),
});

// ------------------------------------------------------------------ commissions

export const commissionQueueQuery = listQuery.extend({
  state: z.enum(["PENDING", "CONFIRMED", "REVERSED"]).optional(),
  partnerId: uuid.optional(),
});

export const createCommissionBody = z.object({
  studentId: uuid,
  /**
   * Minor units, integer. `.int()` is the load-bearing rule: without it `50000.5`
   * arrives, Postgres rounds it, and the amount recorded is not the amount agreed.
   */
  amountMinor: z
    .number()
    .int("Enter a whole amount in minor units.")
    .positive("A commission must be greater than zero.")
    .max(MAX_MINOR, "That amount is too large."),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  basis: z.string().trim().min(1, "Say what this commission is for.").max(200),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM."),
  /**
   * Confirmed on creation only when the registration is already verified. Defaults to
   * false so the safe path is the default: a commission recorded in haste sits in
   * PENDING and does not become withdrawable until somebody says so.
   */
  confirmed: z.boolean().default(false),
});

export const transitionCommissionBody = z.object({
  to: z.enum(["CONFIRMED", "REVERSED"]),
  note: z.string().trim().min(1).max(500).optional(),
});

// -------------------------------------------------------------------- students

export const studentQueueQuery = listQuery.extend({
  partnerId: uuid.optional(),
  stage: z.enum(["ENQUIRY", "DOCUMENTS", "SUBMITTED", "OFFER", "VISA", "REGISTERED"]).optional(),
});

export const updateStudentBody = z.object({
  stage: z.enum(["ENQUIRY", "DOCUMENTS", "SUBMITTED", "OFFER", "VISA", "REGISTERED"]),
});

// ----------------------------------------------------------------------- leads

export const leadQueueQuery = listQuery.extend({
  kind: z.enum(["APPLY", "CONTACT", "PARTNER", "REPRESENTATIVE", "MEDICAL"]).optional(),
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]).optional(),
});

export const updateLeadBody = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]),
});
