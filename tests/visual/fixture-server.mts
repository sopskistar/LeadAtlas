/** Seed only the named localhost PostgreSQL container used for browser review. */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashPassword } from "better-auth/crypto";
import { readFile, readdir } from "node:fs/promises";
import * as schema from "../../src/lib/db/schema";
import { business } from "../fixtures/business";
import { assess } from "../../src/lib/core/quality";

const client = postgres(
  "postgres://postgres:visual-local-only@127.0.0.1:5439/leadatlas_visual",
  { max: 1 },
);
for (const file of (await readdir("drizzle"))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  await client.unsafe(await readFile(`drizzle/${file}`, "utf8"));
}
const db = drizzle(client, { schema });
const ownerId = "visual-review-admin";
await db.insert(schema.user).values({
  id: ownerId,
  name: "Sample workspace",
  email: "review@example.com",
  emailVerified: true,
});
await db.insert(schema.account).values({
  id: "visual-account",
  accountId: ownerId,
  providerId: "credential",
  userId: ownerId,
  password: await hashPassword("Visual-Only-Passphrase-2026"),
});
const jobId = "visual-sample-search";
await db.insert(schema.jobs).values({
  id: jobId,
  ownerId,
  idempotencyKey: "visual-fixture",
  input: {
    product: "contacts",
    country: "US",
    region: "NY",
    city: "New York",
    niche: "plumber",
    sources: ["imports"],
    limit: 10,
    queryBudget: 20,
  },
  status: "COMPLETED",
  stage: "Sample research complete",
  discovered: 2,
  processed: 2,
  qualified: 0,
});
for (const [i, name] of [
  "Example Plumbing Co.",
  "Example Repair Co.",
].entries()) {
  const record = business({
    id: `visual-business-${i}`,
    name,
    importedAt: new Date().toISOString(),
    quality: undefined,
  });
  record.quality = assess(record, "contacts");
  await db.insert(schema.businesses).values({
    id: record.id,
    ownerId,
    identityKey: record.id,
    name: record.name,
    country: record.country,
    region: record.region,
    city: record.city,
    niche: record.niche,
    source: record.source,
    sourceId: record.sourceId,
    record,
  });
  await db.insert(schema.jobItems).values({
    jobId,
    businessId: record.id,
    state: "COMPLETED",
    result: record,
  });
  await db.insert(schema.savedLeads).values({
    ownerId,
    businessId: record.id,
    notes: "Synthetic browser-review fixture. Never a real lead.",
    tags: ["general_lead"],
  });
}
await db.insert(schema.jobEvents).values({
  id: "visual-event",
  jobId,
  stage: "Completed",
  detail:
    "Synthetic fixture research. No provider was contacted; all records remain excluded from export.",
});
await client.end();
console.log(
  "Isolated PostgreSQL review database seeded. Two synthetic, nonexportable records; no external database or provider contacted.",
);
