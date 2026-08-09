/**
 * What may be uploaded — brief §83.
 *
 * Pure, so every rule can be tested exhaustively without a bucket, a database or a
 * request. That matters more here than almost anywhere else in this codebase: these
 * rules stand between the public and a storage bucket, and the files are passports.
 *
 * §83 lists five things to validate — MIME type, extension, size, storage path,
 * ownership — and says do not trust filenames. Four of the five are here; ownership is
 * the service's, because it needs the database to answer.
 *
 * The rule underneath all of them: **the client's claims are evidence, not facts.** The
 * browser sends a filename and a content type, and both are attacker-controlled. What
 * this module produces is a storage key the client never chose.
 */

import { randomUUID } from "node:crypto";

/**
 * Accepted types, as a fixed map from MIME type to its permitted extensions.
 *
 * An allowlist rather than a denylist. A denylist of dangerous types is a list somebody
 * has to keep complete forever, against an attacker who only needs one omission.
 *
 * No `image/svg+xml`. An SVG is a document that can carry script, and one served from a
 * storage origin is stored cross-site scripting against that origin. Applicants
 * photograph their documents; nobody needs to upload a vector.
 */
export const ACCEPTED: Record<string, readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "image/webp": ["webp"],
};

/**
 * Twelve megabytes.
 *
 * A phone photograph of a diploma is two to six; a multi-page scanned PDF can reach ten.
 * Above that is either a mistake or somebody filling the bucket, and both are better
 * refused with an explanation than accepted and puzzled over later.
 */
export const MAX_BYTES = 12 * 1024 * 1024;

/** Below this, it is not a document. A zero-byte upload is a failed one, and accepting it
 *  puts a file in the review queue that nobody can open. */
export const MIN_BYTES = 512;

export type UploadRefusal =
  | { code: "type_not_accepted"; mimeType: string }
  | { code: "extension_mismatch"; extension: string; mimeType: string }
  | { code: "too_large"; bytes: number }
  | { code: "too_small"; bytes: number }
  | { code: "no_extension" };

export type UploadCheck =
  | { ok: true; extension: string }
  | { ok: false; refusal: UploadRefusal };

/**
 * The extension, lowercased, from the last dot.
 *
 * Deliberately naive about everything except the last segment. `passport.pdf.exe` yields
 * `exe` and is refused, which is the case this exists for — a double extension is the
 * oldest trick for getting an executable past a check that looked at the first one.
 */
export function extensionOf(fileName: string): string | null {
  const trimmed = fileName.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) return null;
  return trimmed.slice(dot + 1).toLowerCase();
}

/**
 * May this file be uploaded?
 *
 * The extension must match the declared MIME type, not merely be acceptable on its own.
 * Checking them independently lets `payload.pdf` be declared as `image/png` and stored
 * with a name that invites a reviewer to open it as a PDF.
 */
export function checkUpload(input: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}): UploadCheck {
  const mimeType = input.mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  const permitted = ACCEPTED[mimeType];

  if (!permitted) return { ok: false, refusal: { code: "type_not_accepted", mimeType } };

  const extension = extensionOf(input.fileName);
  if (!extension) return { ok: false, refusal: { code: "no_extension" } };

  if (!permitted.includes(extension)) {
    return { ok: false, refusal: { code: "extension_mismatch", extension, mimeType } };
  }

  if (input.fileSize > MAX_BYTES) {
    return { ok: false, refusal: { code: "too_large", bytes: input.fileSize } };
  }
  if (input.fileSize < MIN_BYTES) {
    return { ok: false, refusal: { code: "too_small", bytes: input.fileSize } };
  }

  return { ok: true, extension };
}

/**
 * The storage key.
 *
 * **Built entirely from server-controlled values.** The application id scopes it, a fresh
 * uuid names it, and the extension is the one already validated against the MIME type.
 * Nothing the client sent reaches this string, which is what makes path traversal
 * impossible rather than merely filtered — there is no input to traverse with.
 *
 * The application id in the path is not access control; the download endpoint checks
 * ownership. It is there so that a bucket listing is legible during an incident.
 */
export function storageKeyFor(applicationId: string, extension: string): string {
  return `applications/${applicationId}/${randomUUID()}.${extension}`;
}

/**
 * Characters that must not survive into a filename.
 *
 * Written as an explicit codepoint range built from `String.fromCharCode`, because the
 * obvious shorthand for "control characters" is easy to mistype as a *space-to-hyphen*
 * class that silently strips hyphens instead. This version cannot be misread.
 */
const CONTROL_CHARS = new Set(
  Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)).concat(String.fromCharCode(127)),
);

/**
 * A filename safe to store and show back.
 *
 * The original is display-only and never addresses anything, but it is still rendered in
 * a review queue and put in a `Content-Disposition` header, so separators, control
 * characters and quotes are removed and the result is capped.
 *
 * A newline in a filename splits that header in two; a NUL truncates it in some parsers.
 */
export function safeDisplayName(fileName: string): string {
  const cleaned = Array.from(fileName)
    .map((char) => {
      if (char === "/" || char === "\\") return "-";
      if (CONTROL_CHARS.has(char)) return "";
      if (char === '"') return "";
      return char;
    })
    .join("")
    .trim();

  return (cleaned || "document").slice(0, 120);
}

/** A refusal in the applicant's terms, naming what to do about it. */
export function describeRefusal(refusal: UploadRefusal): string {
  switch (refusal.code) {
    case "type_not_accepted":
      return "That file type is not accepted. Upload a PDF or a photograph.";
    case "extension_mismatch":
      return "That file's name does not match its contents. Re-save it and try again.";
    case "no_extension":
      return "That file has no extension, so we cannot tell what it is.";
    case "too_large":
      return `That file is larger than ${Math.floor(MAX_BYTES / 1024 / 1024)}MB. Photograph the page rather than scanning at full resolution.`;
    case "too_small":
      return "That file is empty. It may not have finished saving.";
  }
}
