import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before seeding WebEarn demo data.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const seed = await readFile(new URL("./seed.sql", import.meta.url), "utf8");
  await pool.query(seed);
  process.stdout.write("WebEarn demo data seeded.\n");
} finally {
  await pool.end();
}
