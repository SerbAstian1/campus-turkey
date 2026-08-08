/**
 * A local Postgres, with nothing to install.
 *
 * PGlite is Postgres compiled to WebAssembly; `pglite-socket` puts it behind a TCP
 * socket speaking the real wire protocol. So Prisma, `psql` and the application connect
 * to it exactly as they would to a server — migrations, transactions, triggers and all.
 *
 * This exists because "you need Docker" is the reason a local environment goes unset up,
 * and an unset-up local environment is the reason the portal stays a demo. It is not a
 * production database and makes no attempt to be one: single connection, single process.
 *
 *   node scripts/dev-db.mjs          # persists to web/.pglite
 *   node scripts/dev-db.mjs --fresh  # wipes first
 *
 * Then, in another terminal:
 *   npx prisma migrate deploy
 *   node scripts/seed.mjs
 *   npm run dev
 *
 * SERIALIZABLE concurrency still cannot be tested here — one socket, one connection.
 * That needs a real server, and it stays on the list in docs/TESTING.md.
 */

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DATA_DIR = fileURLToPath(new URL("../.pglite", import.meta.url));
const PORT = Number(process.env.DEV_DB_PORT ?? 5432);

if (process.argv.includes("--fresh")) {
  await rm(DATA_DIR, { recursive: true, force: true });
  console.log("Wiped the local database.");
}

const db = await PGlite.create({ dataDir: DATA_DIR });
const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });

await server.start();

console.log(`
Local Postgres ready on 127.0.0.1:${PORT}

  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres
  DIRECT_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres

Data persists in web/.pglite. Ctrl-C to stop.
`);

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
