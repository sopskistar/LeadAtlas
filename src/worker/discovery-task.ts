import { randomUUID } from "node:crypto";
import { and, eq, or, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "../lib/db";
import { jobs, jobItems } from "../lib/db/schema";
import { discover } from "./pipeline";
// Long worldwide discovery runs on the worker, never inside a Vercel request.
// A fenced lease is renewed while running; another replica resumes after expiry.
export async function requestDiscovery(
  jobId: string,
): Promise<{ ids?: string[]; status?: string }> {
  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) throw new Error("Job not found");
  if (job.input.scope !== "global") return discover(jobId);
  if (job.status === "CANCELLED") return { ids: [], status: "CANCELLED" };
  if (
    job.status === "COMPLETED" ||
    job.stage === "Verifying businesses, websites and email" ||
    job.stage === "Resuming verification"
  ) {
    const items = await db
      .select()
      .from(jobItems)
      .where(eq(jobItems.jobId, jobId));
    return { ids: items.map((i) => i.businessId), status: "DONE" };
  }
  if (job.stage === "Discovery unavailable")
    throw new Error(
      "Discovery unavailable; operator review or explicit job retry required",
    );
  const token = randomUUID();
  const [claimed] = await db
    .update(jobs)
    .set({
      status: "RUNNING",
      stage: "Discovering worldwide candidates",
      discoveryLeaseToken: token,
      discoveryLeaseUntil: new Date(Date.now() + 90000),
      error: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobs.id, jobId),
        sql`${jobs.status} != 'CANCELLED'`,
        sql`${jobs.stage} NOT IN ('Verifying businesses, websites and email','Resuming verification','Complete')`,
        or(
          isNull(jobs.discoveryLeaseUntil),
          lt(jobs.discoveryLeaseUntil, new Date()),
        ),
      ),
    )
    .returning();
  if (claimed) {
    const heartbeat = setInterval(() => {
      void db
        .update(jobs)
        .set({
          discoveryLeaseUntil: new Date(Date.now() + 90000),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobs.id, jobId),
            eq(jobs.discoveryLeaseToken, token),
            sql`${jobs.status} != 'CANCELLED'`,
          ),
        )
        .catch(() => {});
    }, 25000);
    void discover(jobId, token)
      .catch(async () => {
        await db
          .update(jobs)
          .set({
            status: "FAILED",
            stage: "Discovery unavailable",
            error:
              "Worldwide research could not complete. Source availability, permissions or the research budget require review.",
          })
          .where(
            and(
              eq(jobs.id, jobId),
              eq(jobs.discoveryLeaseToken, token),
              sql`${jobs.status} != 'CANCELLED'`,
            ),
          );
      })
      .finally(async () => {
        clearInterval(heartbeat);
        await db
          .update(jobs)
          .set({ discoveryLeaseToken: null, discoveryLeaseUntil: null })
          .where(and(eq(jobs.id, jobId), eq(jobs.discoveryLeaseToken, token)));
      })
      .catch(() =>
        console.error(
          "Global discovery task could not persist its completion",
          { jobId },
        ),
      );
  }
  return { status: "IN_PROGRESS" };
}
