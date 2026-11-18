import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { rateLimit } from "../db/schema";

const localWindows = new Map<string, { count: number; expiresAt: number }>();

/**
 * An atomic fixed-window counter shared by all application instances through
 * Postgres. Only a one-way digest of the scope is stored.
 */
export async function consumeRequestLimit(
  scope: string,
  maximum: number,
  windowSeconds = 60,
  now = Date.now(),
) {
  if (!Number.isInteger(maximum) || maximum < 1 || windowSeconds < 1)
    return false;
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(now / windowMs);
  const digest = createHash("sha256").update(scope).digest("hex");
  const key = `api:${bucket}:${digest}`;
  // When persistence is deliberately absent (local preview / unconfigured
  // deployment), non-paid API routes still get a process-local bound. Once
  // DATABASE_URL is configured, failure of the shared store is fail-closed.
  if (!process.env.DATABASE_URL) {
    const current = localWindows.get(key);
    if (current && current.expiresAt > now) {
      if (current.count >= maximum) return false;
      current.count++;
      return true;
    }
    localWindows.set(key, { count: 1, expiresAt: (bucket + 1) * windowMs });
    if (localWindows.size > 10_000)
      for (const [entry, value] of localWindows)
        if (value.expiresAt <= now) localWindows.delete(entry);
    return true;
  }
  try {
    const rows = await getDb()
      .insert(rateLimit)
      .values({
        id: randomUUID(),
        key,
        count: 1,
        lastRequest: bucket * windowMs,
      })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: { count: sql`${rateLimit.count} + 1` },
        setWhere: sql`${rateLimit.count} < ${maximum}`,
      })
      .returning({ count: rateLimit.count });
    return rows.length === 1;
  } catch {
    throw new Error("Shared request limit storage is unavailable");
  }
}

export async function trustedClientRateScope(req: Request) {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return null;
  // This must only be enabled behind a platform proxy that overwrites this
  // header. Hashing occurs in consumeRequestLimit; raw addresses are not stored.
  const address = req.headers
    .get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  return address ? `client:${address}` : null;
}
