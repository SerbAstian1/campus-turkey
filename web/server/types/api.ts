/**
 * The EDSAI boundary contract.
 *
 * `app/src/content/types.ts` is the source of truth for every shape that crosses
 * between the server and the frontend. That file says so itself: *"These are also the
 * contracts that cross into the backend. Declare them once here and import them
 * server-side; do not restate them."*
 *
 * This module holds the mappers, and nothing else. Each one takes a database row and
 * returns the exact frontend type — so if a column is renamed, or an enum gains a
 * member the frontend does not render, the mapper stops compiling. That failure is the
 * whole point: without it, drift between the two layers is only discovered by a user.
 *
 * The direction of authority is one-way. The frontend type wins. Where the database
 * enum and the frontend union disagree in spelling (`REQUESTED` vs `"Requested"`), the
 * mapping is stated explicitly below rather than papered over with a `toLowerCase()`,
 * because a case transformation is not a contract.
 */

import type {
  PayoutMethod,
  PortalStudent,
  Wallet,
  Withdrawal,
} from "@contracts/types";
import type { WithdrawalRecord } from "@/server/modules/withdrawals/withdrawals.repository";
import type { Balance } from "@/server/modules/wallet/balance";

// ------------------------------------------------------------------ withdrawals

/**
 * Database enum to the frontend union.
 *
 * `satisfies Record<..., Withdrawal["status"]>` is what makes this safe: add a status
 * to the database enum without adding it here and this file fails to compile; rename
 * one in `types.ts` and it fails too. A `Record` typed on both sides cannot silently
 * fall out of step.
 */
const WITHDRAWAL_STATUS_DTO = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  PAID: "Paid",
  REJECTED: "Rejected",
} as const satisfies Record<WithdrawalRecord["status"], Withdrawal["status"]>;

export function toWithdrawalDto(row: WithdrawalRecord): Withdrawal {
  return {
    id: row.id,
    reference: row.reference,
    period: row.period,
    basis: row.basis,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: WITHDRAWAL_STATUS_DTO[row.status],
    // ISO 8601 in UTC. The client formats it in the visitor's locale; sending a
    // pre-formatted string would bake the server's locale into 17 languages' worth of
    // interface.
    requestedAt: row.requestedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------- students

const STUDENT_STAGE_DTO = {
  ENQUIRY: "Enquiry",
  DOCUMENTS: "Documents",
  SUBMITTED: "Submitted",
  OFFER: "Offer",
  VISA: "Visa",
  REGISTERED: "Registered",
} as const satisfies Record<string, PortalStudent["stage"]>;

export type StudentStageDb = keyof typeof STUDENT_STAGE_DTO;

/** Exported so the pipeline counts can map a stage without inventing a whole student. */
export function toStageDto(stage: StudentStageDb): PortalStudent["stage"] {
  return STUDENT_STAGE_DTO[stage];
}

export interface StudentRow {
  id: string;
  name: string;
  universityName: string;
  program: string;
  stage: StudentStageDb;
  updatedAt: Date;
  commissionMinor: number;
}

export function toStudentDto(row: StudentRow): PortalStudent {
  return {
    id: row.id,
    name: row.name,
    university: row.universityName,
    program: row.program,
    stage: STUDENT_STAGE_DTO[row.stage],
    updated: row.updatedAt.toISOString(),
    commissionMinor: row.commissionMinor,
  };
}

// ----------------------------------------------------------------- payout methods

const PAYOUT_KIND_DTO = {
  BANK: "bank",
  WISE: "wise",
  STABLECOIN: "stablecoin",
  MOBILE_MONEY: "mobile-money",
} as const satisfies Record<string, PayoutMethod["kind"]>;

export interface PayoutMethodRow {
  id: string;
  kind: keyof typeof PAYOUT_KIND_DTO;
  label: string;
  maskedDetail: string;
  speed: string;
  fee: string;
  isDefault: boolean;
}

/**
 * Note what is absent from the return type: `providerToken`. It is not omitted by
 * convention — `PayoutMethod` in types.ts has no field for it, so including it would
 * not compile. The narrowest useful response, enforced by the contract itself.
 */
export function toPayoutMethodDto(row: PayoutMethodRow): PayoutMethod {
  return {
    id: row.id,
    kind: PAYOUT_KIND_DTO[row.kind],
    label: row.label,
    maskedDetail: row.maskedDetail,
    speed: row.speed,
    fee: row.fee,
    isDefault: row.isDefault,
  };
}

// ------------------------------------------------------------------------ wallet

export function toWalletDto(input: {
  balance: Balance;
  currency: string;
  minimumMinor: number;
  note: string;
  methods: PayoutMethodRow[];
  options: Wallet["options"];
}): Wallet {
  return {
    availableMinor: input.balance.availableMinor,
    pendingMinor: input.balance.pendingMinor,
    lifetimeMinor: input.balance.lifetimeMinor,
    minimumMinor: input.minimumMinor,
    currency: input.currency,
    note: input.note,
    methods: input.methods.map(toPayoutMethodDto),
    options: input.options,
  };
}

/** The envelope every paginated collection uses. Stated once so it cannot vary. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
