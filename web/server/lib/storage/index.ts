/**
 * Object storage — brief §18, §83.
 *
 * ## The shape of the decision
 *
 * §18 says do not put raw uploads in Postgres. §83 says validate MIME type, extension,
 * size, storage path and ownership, and never trust a filename. §62 and §27 say a
 * document must reach only people entitled to it.
 *
 * Those together rule out the obvious design. Uploading through the application means
 * every passport scan passes through this process's memory and its request size limit,
 * and serving them back means a route that streams bytes and must never get its
 * authorization wrong. **Presigned URLs move the bytes directly between the browser and
 * storage**, so the application handles the *decision* and never the *file*.
 *
 * ## What the adapter is for
 *
 * Two implementations, one interface. The local one writes to disk and exists so the
 * upload and review flows can be built and tested before a bucket exists — which is the
 * situation today. The S3 one works against S3, Cloudflare R2 and Supabase Storage alike,
 * because all three speak the same protocol.
 *
 * The interface is deliberately narrow: presign a put, presign a get, delete. Anything
 * wider invites a caller to stream a file through the server, which is the thing this
 * design exists to prevent.
 */

import { env } from "@/server/lib/config";
import { presign } from "./signature";

export interface StorageAdapter {
  /** A URL the browser can PUT the file to directly. Short-lived. */
  presignUpload(key: string, options: { contentType: string; expiresIn?: number }): Promise<string>;
  /** A URL the browser can GET the file from. Short-lived, and never shared. */
  presignDownload(key: string, options?: { expiresIn?: number; filename?: string }): Promise<string>;
  delete(key: string): Promise<void>;
  /** Names the implementation in logs and in the health check. */
  readonly kind: "s3" | "local" | "unconfigured";
}

/**
 * How long a presigned URL lives.
 *
 * Fifteen minutes for an upload: long enough for a large file on a slow connection,
 * short enough that a URL captured from a browser's network tab is useless by the time
 * anyone finds it.
 *
 * Five minutes for a download, because a download URL grants read access to a passport
 * and there is no reason for it to outlive the page that requested it.
 */
export const UPLOAD_TTL_SECONDS = 15 * 60;
export const DOWNLOAD_TTL_SECONDS = 5 * 60;

/* ── S3-compatible ─────────────────────────────────────────────────────────────── */

interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Full origin. R2 and Supabase need this; plain AWS can derive it. */
  endpoint: string;
  /** R2 and Supabase require path-style addressing; AWS prefers virtual-host style. */
  forcePathStyle: boolean;
}

function s3Adapter(config: S3Config): StorageAdapter {
  const url = new URL(config.endpoint);

  // Virtual-host style puts the bucket in the hostname, path style puts it in the path.
  // Getting this wrong signs a different resource than the one being requested, and the
  // failure is a 403 that looks like a credentials problem.
  const host = config.forcePathStyle ? url.host : `${config.bucket}.${url.host}`;
  const prefix = config.forcePathStyle ? `/${config.bucket}` : "";

  const sign = (
    method: "GET" | "PUT" | "DELETE",
    key: string,
    expiresIn: number,
    extraQuery?: Record<string, string>,
  ) =>
    presign({
      method,
      host,
      path: `${prefix}/${key}`,
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      expiresIn,
      ...(extraQuery ? { extraQuery } : {}),
    });

  return {
    kind: "s3",

    async presignUpload(key, options) {
      /* `contentType` is not signed as a header here, deliberately. Signing it would
         require the browser to send exactly that value, and browsers normalise content
         types in ways that produce signature mismatches for no security benefit — the
         type is validated server-side before the key is ever issued. */
      return sign("PUT", key, options.expiresIn ?? UPLOAD_TTL_SECONDS);
    },

    async presignDownload(key, options) {
      return sign("GET", key, options?.expiresIn ?? DOWNLOAD_TTL_SECONDS,
        options?.filename
          ? {
              // Forces a download with the original name rather than rendering in the
              // tab. A PDF rendering inline is fine; an HTML file rendering inline on the
              // storage origin is a stored cross-site scripting hole.
              "response-content-disposition":
                `attachment; filename="${options.filename.replace(/["\\]/g, "")}"`,
            }
          : undefined,
      );
    },

    async delete(key) {
      const signed = sign("DELETE", key, 60);
      const response = await fetch(signed, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Storage delete failed with ${response.status}`);
      }
    },
  };
}

/* ── Local filesystem ──────────────────────────────────────────────────────────── */

/**
 * Development only, and it refuses to exist in production.
 *
 * Files land under `.uploads/`, which is gitignored. This is not a fallback for a
 * misconfigured production deployment: object storage on a serverless platform's local
 * disk is a file that disappears on the next cold start, and discovering that after a
 * student has uploaded a passport is not acceptable. `resolveStorage` refuses it.
 */
function localAdapter(): StorageAdapter {
  return {
    kind: "local",

    async presignUpload(key) {
      // The route below accepts the bytes and writes them. There is no signature because
      // there is nothing to sign against — a local filesystem has no third party.
      return `/api/dev/storage/${encodeURIComponent(key)}`;
    },

    async presignDownload(key) {
      return `/api/dev/storage/${encodeURIComponent(key)}`;
    },

    async delete(key) {
      const { unlink } = await import("node:fs/promises");
      const { join } = await import("node:path");
      try {
        await unlink(join(process.cwd(), ".uploads", key.replace(/\//g, "__")));
      } catch {
        // Already gone is the desired end state.
      }
    },
  };
}

/* ── Selection ─────────────────────────────────────────────────────────────────── */

/** Reports what is configured without touching it, for the health check and for tests. */
export function storageKind(): StorageAdapter["kind"] {
  if (env.STORAGE_PROVIDER === "s3") return "s3";
  if (env.STORAGE_PROVIDER === "local") return "local";
  return "unconfigured";
}

let cached: StorageAdapter | null = null;

/**
 * The configured adapter.
 *
 * Throws rather than degrading when storage is required but absent. A document subsystem
 * that silently accepts an upload it cannot store is worse than one that refuses: the
 * student believes their passport arrived.
 */
export function storage(): StorageAdapter {
  if (cached) return cached;

  const kind = storageKind();

  if (kind === "unconfigured") {
    throw new Error(
      "Document storage is not configured. Set STORAGE_PROVIDER and its credentials; see .env.example.",
    );
  }

  if (kind === "local") {
    // config.ts refuses `local` in production, so reaching here in production would mean
    // the boot check was bypassed. Stated again because the cost of being wrong is a
    // passport on ephemeral disk.
    if (env.NODE_ENV === "production") {
      throw new Error("Local file storage cannot be used in production.");
    }
    cached = localAdapter();
    return cached;
  }

  const missing = (["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_ENDPOINT"] as const)
    .filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(`Storage is set to s3 but ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} missing.`);
  }

  cached = s3Adapter({
    bucket: env.S3_BUCKET!,
    region: env.S3_REGION!,
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    endpoint: env.S3_ENDPOINT!,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  });

  return cached;
}

/** Tests swap the adapter; nothing else should. */
export function __setStorageForTests(adapter: StorageAdapter | null): void {
  cached = adapter;
}
