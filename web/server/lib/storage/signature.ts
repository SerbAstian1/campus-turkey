/**
 * AWS Signature Version 4, for presigned S3 URLs.
 *
 * ## Why this is written by hand rather than pulled from an SDK
 *
 * The whole surface this project needs is two operations — presign a PUT, presign a GET —
 * against an S3-compatible endpoint. `@aws-sdk/client-s3` brings roughly a megabyte and a
 * release cadence for that, and it does not work against Cloudflare R2 or Supabase Storage
 * without configuration anyway. SigV4 is a published, stable specification; this is about
 * eighty lines of it.
 *
 * ## Why that is not reckless
 *
 * Hand-rolling a signature is normally a bad trade, because a subtle error produces
 * something that looks fine and fails in production. **AWS publishes worked examples with
 * expected signatures**, so this can be proved correct without a bucket, without
 * credentials, and without network access — see `signature.test.ts`. A wrong byte anywhere
 * in the canonical request changes the final hex, so the test is not approximate.
 *
 * Nothing here is Campus Turkey-specific. It signs a request; the storage adapter decides
 * what to sign.
 */

import { createHash, createHmac } from "node:crypto";

const ALGORITHM = "AWS4-HMAC-SHA256";

/** Presigned URLs sign the payload as literally this string rather than its hash: the
 *  body does not exist yet at signing time. */
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";

const sha256Hex = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const hmac = (key: string | Buffer, value: string): Buffer =>
  createHmac("sha256", key).update(value, "utf8").digest();

/**
 * Percent-encode for a canonical request.
 *
 * `encodeURIComponent` leaves `!'()*` alone and AWS requires them encoded, so those are
 * fixed up. The path variant keeps `/` literal, because a canonical URI is a path and
 * encoding its separators would sign a different resource than the one being requested.
 */
function encodeRfc3986(value: string, keepSlashes = false): string {
  const encoded = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return keepSlashes ? encoded.replace(/%2F/g, "/") : encoded;
}

/**
 * Canonical query string: sorted by key, then by value, every part encoded.
 *
 * The sort is byte order on the *encoded* key, which is what the specification says and
 * what a naive `sort()` on decoded keys gets wrong for anything containing a character
 * that encodes above `~`.
 */
function canonicalQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/** `20130524T000000Z` and `20130524`, which is the only date format SigV4 accepts. */
export function amzDate(now: Date): { long: string; short: string } {
  const long = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { long, short: long.slice(0, 8) };
}

/**
 * The signing key: four chained HMACs, each keyed by the previous result.
 *
 * The chain is what makes a leaked signature useless outside its date, region and
 * service — it is scoped by construction rather than by a check somewhere.
 */
function signingKey(secretKey: string, short: string, region: string, service: string): Buffer {
  const dateKey = hmac(`AWS4${secretKey}`, short);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

export interface PresignInput {
  method: "GET" | "PUT" | "DELETE";
  /** Host only, no scheme: `examplebucket.s3.amazonaws.com`. */
  host: string;
  /** Absolute, leading slash, not yet encoded: `/passports/abc.pdf`. */
  path: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Seconds. S3 caps this at seven days; the caller should be far below that. */
  expiresIn: number;
  /** Temporary credentials add a session token, which must be signed with the rest. */
  sessionToken?: string;
  /** Extra query parameters to include in the signature, such as a response
   *  content-disposition. Anything not signed here is rejected by S3 at request time. */
  extraQuery?: Record<string, string>;
  service?: string;
  now?: Date;
}

/**
 * Build a presigned URL.
 *
 * Returned as a string because that is what a browser needs: the client uploads straight
 * to storage, so the file never passes through this application's memory or its request
 * size limits.
 */
export function presign(input: PresignInput): string {
  const service = input.service ?? "s3";
  const { long, short } = amzDate(input.now ?? new Date());
  const scope = `${short}/${input.region}/${service}/aws4_request`;

  const query: Record<string, string> = {
    "X-Amz-Algorithm": ALGORITHM,
    "X-Amz-Credential": `${input.accessKeyId}/${scope}`,
    "X-Amz-Date": long,
    "X-Amz-Expires": String(input.expiresIn),
    "X-Amz-SignedHeaders": "host",
    ...(input.sessionToken ? { "X-Amz-Security-Token": input.sessionToken } : {}),
    ...input.extraQuery,
  };

  const canonicalRequest = [
    input.method,
    encodeRfc3986(input.path, true),
    canonicalQuery(query),
    `host:${input.host}\n`,
    "host",
    UNSIGNED_PAYLOAD,
  ].join("\n");

  const stringToSign = [
    ALGORITHM,
    long,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = hmac(
    signingKey(input.secretAccessKey, short, input.region, service),
    stringToSign,
  ).toString("hex");

  const signed = { ...query, "X-Amz-Signature": signature };

  return `https://${input.host}${encodeRfc3986(input.path, true)}?${canonicalQuery(signed)}`;
}

/** Exported for the test suite, which checks the intermediate values as well as the
 *  final signature — a matching signature from a wrong canonical request is not
 *  possible, but a mismatch is far easier to diagnose when the steps are visible. */
export const internals = { canonicalQuery, encodeRfc3986, sha256Hex, signingKey };
