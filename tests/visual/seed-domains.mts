/** Additional, explicitly nonexportable domain-result fixture for browser review. */
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../src/lib/db/schema";
import { business } from "../fixtures/business";
import { matchDomain } from "../../src/lib/core/domain";
import { assess } from "../../src/lib/core/quality";
const client = postgres(
  "postgres://postgres:visual-local-only@127.0.0.1:5439/leadatlas_visual",
  { max: 1 },
);
const db = drizzle(client, { schema });
const now = new Date().toISOString();
const record = business({
  id: "00000000-0000-4000-8000-000000000003",
  sourceId: "visual-domain-fixture",
  name: "Novalith Fixture",
  country: "DE",
  city: "Berlin",
  region: "BE",
  websites: ["https://novalithfixture.example"],
  fixture: true,
});
record.contacts = record.contacts.map((contact) => ({
  ...contact,
  email: "hello@novalithfixture.example",
  sourceUrl: "https://novalithfixture.example/contact",
  rights: { ...contact.rights, url: "https://novalithfixture.example/contact" },
}));
record.website = {
  ...record.website!,
  url: record.websites[0],
  checkedAt: now,
};
record.domainMatch = matchDomain("novalithfixture.com", record, "brandable");
record.quality = assess(record, "domains");
await db
  .insert(schema.jobs)
  .values({
    id: "visual-domain-search",
    ownerId: "visual-review-admin",
    idempotencyKey: "visual-domain-review",
    input: {
      product: "domains",
      scope: "global",
      domain: "novalithfixture.com",
      domainKind: "auto",
      ownershipAffirmed: true,
      sources: [],
      limit: 10,
      queryBudget: 0,
    },
    status: "COMPLETED",
    stage: "Complete",
    discovered: 1,
    processed: 1,
    qualified: 0,
  })
  .onConflictDoNothing();
await db
  .insert(schema.businesses)
  .values({
    id: record.id,
    ownerId: "visual-review-admin",
    identityKey: "visual-global-domain-fixture",
    source: record.source,
    sourceId: record.sourceId,
    name: record.name,
    country: record.country,
    region: record.region,
    city: record.city,
    niche: record.niche,
    record,
  })
  .onConflictDoNothing();
await db
  .insert(schema.jobItems)
  .values({
    jobId: "visual-domain-search",
    businessId: record.id,
    state: "DONE",
    result: record,
  })
  .onConflictDoNothing();
await db
  .update(schema.businesses)
  .set({ record })
  .where(eq(schema.businesses.id, record.id));
await db
  .update(schema.jobItems)
  .set({ result: record })
  .where(
    and(
      eq(schema.jobItems.jobId, "visual-domain-search"),
      eq(schema.jobItems.businessId, record.id),
    ),
  );
await client.end();
console.log(
  "Added one fictional, nonexportable domain browser fixture. No provider contacted.",
);
