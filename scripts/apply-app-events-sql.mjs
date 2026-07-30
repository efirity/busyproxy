#!/usr/bin/env node
/**
 * Apply docs/supabase/005_app_events.sql to DATABASE_URL or SUPABASE_DB_URL.
 * Usage: node scripts/apply-app-events-sql.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnv } from "../server/env.mjs";

loadEnv();

const url =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "";

if (!url) {
  console.error(
    "Set SUPABASE_DB_URL or DATABASE_URL (Postgres connection string) to apply schema.",
  );
  process.exit(1);
}

const sqlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../docs/supabase/005_app_events.sql",
);

const sql = await readFile(sqlPath, "utf8");
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  await client.query(sql);
  console.log("✓ app_events schema applied (+ 14d purge schedule if pg_cron available)");
} finally {
  client.release();
  await pool.end();
}
