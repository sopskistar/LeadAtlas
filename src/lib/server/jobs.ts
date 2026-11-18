import { validCategoryChoice } from "../reference/lookups";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { jobs, quotaCounters, jobEvents } from "../db/schema";
import { searchSchema } from "../core/validation";
import {
  limits,
  providerCallCostUsd,
  providerSpendConfigured,
} from "../core/config";
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
  const requested =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const configured = limits();
  const input = searchSchema.parse({
    ...requested,
    limit:
      requested.limit ??
      Math.min(
        configured.SEARCH_INITIAL_RESULTS,
        configured.MAX_SEARCH_RESULTS,
      ),
    queryBudget:
      requested.queryBudget ??
      Math.max(
        configured.SEARCH_QUERY_BUDGET,
        requested.product === "domains" && Array.isArray(requested.domains)
          ? requested.domains.length +
              Math.min(
                configured.SEARCH_INITIAL_RESULTS,
                requested.domains.length,
              )
          : 0,
      ),
  });
  if (
    input.product !== "domains" &&
    input.categoryId &&
    !validCategoryChoice(input.categoryId, input.niche)
  )
    throw new Error(
      "The selected category does not match this niche. Choose it again or use a custom niche.",
    );
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
    const month = day.slice(0, 7);
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
    const monthly = await tx
      .insert(quotaCounters)
      .values({ scope: `${scope}:month`, day: month, units })
      .onConflictDoUpdate({
        target: [quotaCounters.scope, quotaCounters.day],
        set: { units: sql`${quotaCounters.units} + ${units}` },
        setWhere: sql`${quotaCounters.units} + ${units} <= ${limits().MONTHLY_SEARCH_BUDGET}`,
      })
      .returning();
    if (
      !monthly.length ||
      monthly[0].units > limits().MONTHLY_SEARCH_BUDGET
    )
      throw new Error("Monthly search budget exceeded");
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
  const month = day.slice(0, 7);
  const providerName = provider.toLowerCase();
  const freeProviders = new Set([
    "commoncrawl",
    "imports",
    "overture",
    "canada",
    "directories",
    "website",
  ]);
  if (!freeProviders.has(providerName) && !providerSpendConfigured(provider))
    throw new Error(
      `Provider spend budget is disabled: configure a positive per-call maximum cost and daily/monthly caps for ${providerName}.`,
    );
  const reservedMicroUsd = freeProviders.has(providerName)
    ? 0
    : Math.max(1, Math.ceil(providerCallCostUsd(provider) * 1_000_000));
  await getDb().transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.ownerId, ownerId)));
    if (!job || job.status === "CANCELLED")
      throw new Error("Job cancelled or unavailable");
    for (const [scope, period, maximum] of [
      [`provider:${provider}`, day, limits().PROVIDER_DAILY_LIMIT],
      [
        `provider:${provider}:month`,
        month,
        limits().PROVIDER_MONTHLY_LIMIT,
      ],
      [`job:${jobId}`, "lifetime", job.input.queryBudget],
    ] as const) {
      if (maximum <= 0) throw new Error("Provider query budget exhausted");
      const used = await tx
        .insert(quotaCounters)
        .values({
          scope,
          day: period,
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
    if (reservedMicroUsd > 0) {
      const dailyCap = Math.floor(
        limits().PROVIDER_DAILY_SPEND_USD * 1_000_000,
      );
      const monthlyCap = Math.floor(
        limits().PROVIDER_MONTHLY_SPEND_USD * 1_000_000,
      );
      for (const [scope, period, cap] of [
        ["spend:all:day", day, dailyCap],
        ["spend:all:month", month, monthlyCap],
        [`spend:${providerName}:day`, day, dailyCap],
        [`spend:${providerName}:month`, month, monthlyCap],
      ] as const) {
        const spent = await tx
          .insert(quotaCounters)
          .values({ scope, day: period, units: reservedMicroUsd })
          .onConflictDoUpdate({
            target: [quotaCounters.scope, quotaCounters.day],
            set: {
              units: sql`${quotaCounters.units} + ${reservedMicroUsd}`,
            },
            setWhere: sql`${quotaCounters.units} + ${reservedMicroUsd} <= ${cap}`,
          })
          .returning({ units: quotaCounters.units });
        if (!spent.length)
          throw new Error(
            `Provider daily/monthly spend budget exhausted for ${providerName}`,
          );
      }
    }
  });
}
