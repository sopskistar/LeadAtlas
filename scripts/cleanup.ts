import { config } from "dotenv";
import { lt, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import {
  session,
  verification,
  evidenceLog,
  jobEvents,
  jobs,
  rateLimit,
} from "../src/lib/db/schema";
config({ path: ".env.local" });
config();
async function main() {
  const db = getDb();
  await db.delete(session).where(lt(session.expiresAt, new Date()));
  await db.delete(verification).where(lt(verification.expiresAt, new Date()));
  await db
    .delete(rateLimit)
    .where(sql`${rateLimit.lastRequest} < ${Date.now() - 86400000}`);
  const history = new Date(Date.now() - 180 * 86400000);
  await db.delete(evidenceLog).where(lt(evidenceLog.createdAt, history));
  await db.delete(jobEvents).where(lt(jobEvents.createdAt, history));
  const cancelled = new Date(Date.now() - 90 * 86400000);
  await db
    .delete(jobs)
    .where(
      sql`${jobs.createdAt} < ${cancelled} AND ${jobs.status} IN ('CANCELLED','FAILED','DISPATCH_FAILED')`,
    );
  console.info(
    "Expired sessions, rate limits and retained history cleaned. Business suppression records retained.",
  );
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error("Cleanup failed; check database permissions");
    process.exit(1);
  });
