/**
 * One-time setup, run from the repository root.
 *
 *   npm run setup
 *
 * **The copying itself lives in `web/scripts/sync-design-system.mjs`,** and this is a
 * thin wrapper over it. It used to be the other way round, and that is what broke the
 * first deployment: the only implementation was here, at the root, so a platform whose
 * root directory is `web/` had no way to run it. The build then produced a site whose
 * every stylesheet, font and icon was a 404, and did so without failing.
 *
 * Keeping one implementation matters more than which end it sits at. Two copy scripts
 * would drift the moment the design system gains a folder, and the failure that follows
 * is silent in exactly the same way.
 *
 * Re-run this after the design system in `_ds/` changes.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(root, "web", "scripts", "sync-design-system.mjs");

const result = spawnSync(process.execPath, [script], { stdio: "inherit" });

process.exit(result.status ?? 1);
