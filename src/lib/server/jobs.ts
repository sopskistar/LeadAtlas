import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { jobs, quotaCounters, jobEvents } from "../db/schema";
import { searchSchema } from "../core/validation";
import { limits } from "../core/config";
import { stableJson } from "../core/normalize";
export function jobsConfigured() {
  return (
    !!process.env.WORKER_URL &&
    (process.env.WORKER_SECRET?.length ?? 0) >= 32 &&
    ((process.env.INNGEST_DEV === "1" &&
      process.env.NODE_ENV !== "production") ||
      (!!process.env.INNGEST_EVENT_KEY && !!process.env.INNGEST_SIGNING_KEY))
  );
}
export async function createJob(ownerId: string, raw: unknown, key: string) {
  const input = searchSchema.parse(raw);
  if (input.limit > limits().MAX_SEARCH_RESULTS)
    throw new Error("Result budget exceeds configured maximum");
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key))
    throw new Error("Valid Idempotency-Key required");
  return getDb().transaction(async (tx) => {
    const rows = await tx
      .insert(jobs)
      .values({ id: randomUUID(), ownerId, input, idempotencyKey: key })
      .onConflictDoNothing()
      .returning();
    if (!rows.length) {
      const [existing] = await tx
        .select()
        .from(jobs)
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.idempotencyKey, key)));
      if (stableJson(existing.input) !== stableJson(input))
        throw new Error(
          "Idempotency key was already used with different search settings",
        );
      return existing;
    }
    const day = new Date().toISOString().slice(0, 10);
    const scope = `owner:${ownerId}`;
    const units = input.limit + input.queryBudget;
    const reserved = await tx
      .insert(quotaCounters)
      .values({ scope, day, units })
      .onConflictDoUpdate({
        target: [quotaCounters.scope, quotaCounters.day],
        set: { units: sql`${quotaCounters.units} + ${units}` },
        setWhere: sql`${quotaCounters.units} + ${units} <= ${limits().DAILY_SEARCH_BUDGET}`,
      })
      .returning();
    if (!reserved.length || reserved[0].units > limits().DAILY_SEARCH_BUDGET)
      throw new Error("Daily search budget exceeded");
    await tx.insert(jobEvents).values({
      id: randomUUID(),
      jobId: rows[0].id,
      stage: "QUEUED",
      detail: `Reserved ${units} work units; unverified records are not qualified credits`,
    });
    return rows[0];
  });
}
export async function consumeProvider(
  ownerId: string,
  jobId: string,
  provider: string,
) {
  const day = new Date().toISOString().slice(0, 10);
  await getDb().transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.ownerId, ownerId)));
    if (!job || job.status === "CANCELLED")
      throw new Error("Job cancelled or unavailable");
    for (const [scope, maximum] of [
      [`provider:${provider}`, limits().PROVIDER_DAILY_LIMIT],
      [`job:${jobId}`, job.input.queryBudget],
    ] as const) {
      if (maximum <= 0) throw new Error("Provider query budget exhausted");
      const used = await tx
        .insert(quotaCounters)
        .values({
          scope,
          day: scope.startsWith("job:") ? "lifetime" : day,
          units: 1,
        })
        .onConflictDoUpdate({
          target: [quotaCounters.scope, quotaCounters.day],
          set: { units: sql`${quotaCounters.units} + 1` },
          setWhere: sql`${quotaCounters.units} < ${maximum}`,
        })
        .returning();
      if (!used.length)
        throw new Error("Provider quota or job query budget exhausted");
    }
  });
}
