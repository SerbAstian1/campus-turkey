/**
 * The audit log — brief §26.
 *
 * Two things make this different from the application's log stream. It is queryable by
 * entity, so "everything that ever happened to application CT-2026-00041" is one index
 * scan rather than a grep. And it is append-only in the database, so it settles arguments
 * rather than merely describing them.
 *
 * ## The prohibition
 *
 * §26 lists what must never be logged: passwords, session tokens, reset tokens,
 * credentials. This module strips those keys before writing, and a database CHECK refuses
 * the row if one arrives anyway. Both, deliberately — an audit log is the most durable
 * place a secret can land, because it is append-only by design and a mistake cannot be
 * deleted afterwards.
 */

import { randomUUID } from "node:crypto";
import { db, type Db } from "@/server/lib/db";

/**
 * Keys whose values never reach the table.
 *
 * Matched case-insensitively and by substring, so `userPassword`, `reset_token` and
 * `X-Api-Key` are all caught. Substring matching over-redacts occasionally — a field
 * called `passwordPolicy` would be stripped — and that is the right direction to be
 * wrong in.
 */
const FORBIDDEN = [
  "password", "token", "secret", "credential", "authorization", "cookie",
  "apikey", "api_key", "claimcode", "claim_code", "otp", "signature",
];

const REDACTED = "[redacted]";

function isForbidden(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[-_]/g, "");
  return FORBIDDEN.some((term) => normalised.includes(term.replace(/[-_]/g, "")));
}

/**
 * Strip forbidden keys, recursively.
 *
 * Depth-limited because metadata comes from callers and a cyclic or deeply nested object
 * would otherwise recurse until the stack gives out — turning an audit write into a
 * crash, which is the one thing an audit write must never do.
 */
export function redactMetadata(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactMetadata(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isForbidden(key) ? REDACTED : redactMetadata(inner, depth + 1);
    }
    return out;
  }

  // Strings are kept as they are. A value that happens to look like a token is not
  // detectable without guessing, and guessing would redact legitimate content.
  return value;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  ipPrefix?: string | null;
}

/**
 * Write one entry.
 *
 * Takes an optional transaction client so it can be called **inside** the transaction it
 * describes. §51 requires exactly that for status changes: an audit line written after a
 * commit that then failed would record something that did not happen.
 */
export async function recordAudit(entry: AuditEntry, tx: Db = db): Promise<void> {
  await tx.auditLog.create({
    data: {
      id: randomUUID(),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actorUserId: entry.actorUserId ?? null,
      ipPrefix: entry.ipPrefix ?? null,
      metadata: entry.metadata
        ? (redactMetadata(entry.metadata) as object)
        : undefined,
    },
  });
}

export interface AuditQuery {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  limit: number;
  cursor?: string;
}

/** §48's audit log screen. Staff-only; the endpoint enforces that. */
export async function listAudit(query: AuditQuery) {
  const items = await db.auditLog.findMany({
    where: {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: query.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true, action: true, entityType: true, entityId: true,
      metadata: true, ipPrefix: true, createdAt: true,
      actor: { select: { name: true, email: true, role: true } },
    },
  });

  const hasMore = items.length > query.limit;
  const page = hasMore ? items.slice(0, query.limit) : items;

  return { items: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
}
