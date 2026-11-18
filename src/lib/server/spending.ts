import { sql } from "drizzle-orm";
import { limits, providerCallCostUsd, providerSpendConfigured } from "../core/config";
import { getDb } from "../db";
import { quotaCounters } from "../db/schema";

/** Reserve the operator-defined maximum before a paid call outside a search job. */
export async function reserveExternalProviderSpend(provider: string) {
  const name = provider.toLowerCase();
  if (!providerSpendConfigured(name))
    throw new Error(
      `Provider spend budget is disabled: configure a positive per-call maximum cost and daily/monthly caps for ${name}.`,
    );
  const reservedMicroUsd = Math.max(
    1,
    Math.ceil(providerCallCostUsd(name) * 1_000_000),
  );
  const day = new Date().toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const dailyCap = Math.floor(limits().PROVIDER_DAILY_SPEND_USD * 1_000_000);
  const monthlyCap = Math.floor(
    limits().PROVIDER_MONTHLY_SPEND_USD * 1_000_000,
  );
  await getDb().transaction(async (tx) => {
    for (const [scope, period, cap] of [
      ["spend:all:day", day, dailyCap],
      ["spend:all:month", month, monthlyCap],
      [`spend:${name}:day`, day, dailyCap],
      [`spend:${name}:month`, month, monthlyCap],
    ] as const) {
      const rows = await tx
        .insert(quotaCounters)
        .values({ scope, day: period, units: reservedMicroUsd })
        .onConflictDoUpdate({
          target: [quotaCounters.scope, quotaCounters.day],
          set: { units: sql`${quotaCounters.units} + ${reservedMicroUsd}` },
          setWhere: sql`${quotaCounters.units} + ${reservedMicroUsd} <= ${cap}`,
        })
        .returning({ units: quotaCounters.units });
      if (!rows.length)
        throw new Error(`Provider daily/monthly spend budget exhausted for ${name}`);
    }
  });
}
