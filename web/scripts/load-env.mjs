/**
 * Loads `.env` for scripts run under plain `node`.
 *
 * The Prisma CLI and Next.js each read `.env` themselves. `node scripts/seed.mjs` does
 * not, so without this every script here dies with "Environment variable not found:
 * DATABASE_URL" against a `.env` file sitting right next to it — which reads like a
 * configuration bug and is not one.
 *
 * Two deliberate behaviours:
 *
 *   A missing `.env` is not an error. In CI and on the hosting platform the variables
 *   are already in the environment and no file exists; that is the normal case there,
 *   not a failure.
 *
 *   A variable already present in the real environment wins over the file. That is what
 *   makes `DATABASE_URL=... node scripts/seed.mjs` work for pointing a script at a
 *   throwaway database without editing `.env` — and it means a CI secret can never be
 *   silently overwritten by a stray committed file. Node's own precedence here has
 *   changed between releases, so this restores the originals explicitly rather than
 *   trusting it.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = join(dirname(dirname(fileURLToPath(import.meta.url))), ".env");

if (existsSync(envPath)) {
  const preexisting = { ...process.env };
  process.loadEnvFile(envPath);
  for (const [key, value] of Object.entries(preexisting)) process.env[key] = value;
}
