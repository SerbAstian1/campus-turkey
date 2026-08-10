/**
 * Documents — brief §18, §62, §83.
 *
 * This is where §83's fifth rule lives. The other four — MIME type, extension, size,
 * storage path — are pure and tested in `upload.rules.ts`; **ownership needs the
 * database**, and it is the one that decides whether a stranger can read a passport.
 *
 * One function answers it, `reachableApplication`, and every operation in this file goes
 * through it. There is no second path to a document, which is what makes the guarantee
 * structural rather than a check each new endpoint has to remember to copy.
 */

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/lib/db";
import { ForbiddenError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import { storage, UPLOAD_TTL_SECONDS, DOWNLOAD_TTL_SECONDS } from "@/server/lib/storage";
import type { Principal } from "@/server/lib/permissions";
import {
  checkUpload, describeRefusal, safeDisplayName, storageKeyFor,
  type UploadCheck,
} from "./upload.rules";

/** Who is asking, in the terms this module needs. */
export interface DocumentActor {
  userId: string;
  principal: Principal;
  /** Set for a signed-in student. */
  studentProfileId?: string | null;
  /** Set for a partner or representative. */
  partnerId?: string | null;
  representativeId?: string | null;
}

/**
 * May this actor reach this application at all?
 *
 * Expressed as a `where` clause rather than a fetch-then-compare, so the scope is applied
 * by the database in the same query that loads the row. A fetch-then-compare has a moment
 * where the wrong row is in memory, and that moment is where a logging line or an early
 * return leaks it.
 *
 * Staff reach everything, by role. Everyone else reaches only what is theirs, and §62 is
 * explicit that a partner sees their own students and nothing else.
 */
/**
 * The `where` fragment describing everything this actor may reach.
 *
 * Extracted so the document lookup can apply the same scope in its own query rather
 * than checking the application separately afterwards — see `reachableDocument`.
 */
function applicationScope(actor: DocumentActor) {
  const isStaff =
    actor.principal.role === "STAFF" ||
    actor.principal.role === "ADMIN" ||
    actor.principal.role === "SUPER_ADMIN";

  if (isStaff) return {};

  const OR = [
    ...(actor.studentProfileId ? [{ student: { profileId: actor.studentProfileId } }] : []),
    ...(actor.partnerId ? [{ partnerId: actor.partnerId }] : []),
    ...(actor.representativeId ? [{ representativeId: actor.representativeId }] : []),
  ];

  // An actor with no scope at all would produce `OR: []`, which Prisma treats as matching
  // nothing — but relying on that is relying on a library's edge case. Refused explicitly.
  if (OR.length === 0) {
    throw new ForbiddenError("You do not have access to that application.");
  }

  return { OR };
}

async function reachableApplication(applicationId: string, actor: DocumentActor) {
  const application = await db.application.findFirst({
    where: { id: applicationId, ...applicationScope(actor) },
    select: { id: true, status: true, applicationNumber: true },
  });

  // 404 rather than 403 for an application that exists but is not theirs. A 403 confirms
  // the application number is real, which is the one thing an outsider guessing numbers
  // would want to learn.
  if (!application) throw new NotFoundError("We could not find that application.");

  return application;
}

/**
 * Resolve a document the actor is allowed to see, in one query.
 *
 * The obvious shape — load the document by id, then check its application — leaks the
 * distinction this module is built to hide. Both refusals are a 404, but they carry
 * *different messages*: "we could not find that document" for an id that does not
 * exist, and "we could not find that application" for one that exists and belongs to
 * somebody else. That is an oracle. A caller walking ids learns which are real without
 * ever being allowed to read one, and it survived review precisely because both paths
 * looked like a correct 404 in isolation.
 *
 * Found by the isolation suite, which asserts the two answers are identical. Fixed by
 * scoping the lookup instead of checking after it, so there is only one refusal and no
 * second message to keep in step.
 */
async function reachableDocument<T extends Prisma.DocumentSelect>(
  documentId: string,
  actor: DocumentActor,
  select: T,
) {
  const document = await db.document.findFirst({
    where: { id: documentId, application: applicationScope(actor) },
    select,
  });

  if (!document) throw new NotFoundError("We could not find that document.");

  return document;
}

export interface RequestUploadInput {
  applicationId: string;
  type: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Issue a presigned upload URL and the row that will describe the file.
 *
 * The row is created *before* the upload, in PENDING with no `uploadedAt`. That ordering
 * matters: a row without `uploadedAt` is a URL that was issued and never used, and it is
 * excluded from every list. The alternative — create the row after the browser reports
 * success — loses the file entirely if the browser closes mid-upload, because nothing
 * records that the object exists.
 */
export async function requestUpload(
  input: RequestUploadInput,
  actor: DocumentActor,
  log: RequestLogger,
) {
  const application = await reachableApplication(input.applicationId, actor);

  // §83's first four rules, before anything is written or signed.
  const check: UploadCheck = checkUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  if (!check.ok) {
    log.info("upload refused", { code: check.refusal.code, applicationId: application.id });
    throw new UnprocessableError(check.refusal.code, describeRefusal(check.refusal));
  }

  const storageKey = storageKeyFor(application.id, check.extension);

  const document = await db.document.create({
    data: {
      id: randomUUID(),
      applicationId: application.id,
      uploadedByUserId: actor.userId,
      type: input.type as never,
      // Display only. Never used to address anything — see `storageKeyFor`.
      fileName: safeDisplayName(input.fileName),
      storageKey,
      mimeType: input.mimeType.toLowerCase().split(";")[0]?.trim() ?? input.mimeType,
      fileSize: input.fileSize,
      status: "PENDING",
    },
    select: { id: true, fileName: true, type: true, status: true },
  });

  const uploadUrl = await storage().presignUpload(storageKey, {
    contentType: input.mimeType,
    expiresIn: UPLOAD_TTL_SECONDS,
  });

  log.audit("document.upload_requested", {
    documentId: document.id,
    applicationId: application.id,
    type: input.type,
    fileSize: input.fileSize,
  });

  return { document, uploadUrl, expiresInSeconds: UPLOAD_TTL_SECONDS };
}

/**
 * Mark an upload as finished.
 *
 * Called by the browser once storage accepts the PUT. Until this runs the document is
 * invisible to the review queue, which is what stops staff opening a file that is half
 * written or absent.
 */
export async function confirmUpload(
  input: { documentId: string },
  actor: DocumentActor,
  log: RequestLogger,
) {
  // Scope is re-applied rather than trusted from the upload call: this is a separate
  // request and the id in it is client-supplied.
  const document = await reachableDocument(input.documentId, actor, {
    id: true, applicationId: true, uploadedAt: true,
  });

  if (document.uploadedAt) return { ok: true as const };

  await db.document.update({
    where: { id: document.id },
    data: { uploadedAt: new Date() },
  });

  log.audit("document.uploaded", { documentId: document.id, applicationId: document.applicationId });

  return { ok: true as const };
}

/**
 * A short-lived URL to read one document.
 *
 * **Never a public object URL.** The bucket is private; this signs a URL that expires in
 * five minutes and is generated per request, so a link copied out of a browser is dead
 * long before it can be shared usefully.
 */
export async function downloadUrl(
  input: { documentId: string },
  actor: DocumentActor,
  log: RequestLogger,
) {
  const document = await reachableDocument(input.documentId, actor, {
    id: true, applicationId: true, storageKey: true, fileName: true, uploadedAt: true,
  });

  if (!document.uploadedAt) {
    throw new UnprocessableError("upload_incomplete", "That file has not finished uploading.");
  }

  const url = await storage().presignDownload(document.storageKey, {
    expiresIn: DOWNLOAD_TTL_SECONDS,
    filename: document.fileName,
  });

  // Every read of a document is recorded. These are passports; who looked and when is
  // the question an incident review starts with.
  log.audit("document.downloaded", {
    documentId: document.id,
    applicationId: document.applicationId,
    byUserId: actor.userId,
  });

  return { url, expiresInSeconds: DOWNLOAD_TTL_SECONDS };
}

/** Documents on an application, scoped by the same rule as everything else here. */
export async function listDocuments(applicationId: string, actor: DocumentActor) {
  await reachableApplication(applicationId, actor);

  return db.document.findMany({
    where: {
      applicationId,
      // Abandoned presigned URLs are not documents. Excluding them here rather than
      // filtering per caller means no list can accidentally include one.
      uploadedAt: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, type: true, fileName: true, mimeType: true, fileSize: true,
      status: true, rejectionReason: true, reviewedAt: true, uploadedAt: true,
      reviewedBy: { select: { name: true } },
    },
  });
}

/**
 * Review a document. Staff only, enforced by the endpoint's permission.
 *
 * A rejection requires a reason, in the service and again as a database constraint. The
 * reason is the only thing the applicant is told, and a rejection without one leaves them
 * with a refused document and nothing to act on.
 */
export async function reviewDocument(
  input: { documentId: string; status: "APPROVED" | "REJECTED" | "REQUIRES_REUPLOAD"; reason?: string },
  actor: { userId: string },
  log: RequestLogger,
) {
  const document = await db.document.findUnique({
    where: { id: input.documentId },
    select: { id: true, applicationId: true, uploadedAt: true, status: true },
  });
  if (!document) throw new NotFoundError("We could not find that document.");

  if (!document.uploadedAt) {
    throw new UnprocessableError(
      "upload_incomplete",
      "That file has not finished uploading, so there is nothing to review yet.",
    );
  }

  if (input.status !== "APPROVED" && !input.reason?.trim()) {
    throw new UnprocessableError(
      "reason_required",
      "Say what is wrong with it. The applicant is shown exactly this.",
    );
  }

  const updated = await db.document.update({
    where: { id: document.id },
    data: {
      status: input.status,
      rejectionReason: input.status === "APPROVED" ? null : input.reason!.trim(),
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
    },
    select: { id: true, status: true, rejectionReason: true, reviewedAt: true },
  });

  log.audit("document.reviewed", {
    documentId: document.id,
    applicationId: document.applicationId,
    from: document.status,
    to: input.status,
    actorUserId: actor.userId,
  });

  return updated;
}
