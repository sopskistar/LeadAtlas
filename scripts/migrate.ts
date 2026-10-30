import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
config({ path: ".env.local" });
config();
async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL");
  const client = postgres(url, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    console.info("Migrations applied");
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error("Migration failed. Check connection and migration history.");
  process.exitCode = 1;
});
