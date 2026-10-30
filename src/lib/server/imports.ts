import { createHash, randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { businesses, ingestionBatches } from "../db/schema";
import {
  identityKey,
  independentWebsite,
  mergeRecords,
} from "../core/normalize";
import { validRegion } from "../core/locations";
import type { BusinessRecord, FieldRight } from "../core/types";
import {
  limits,
  permittedEvidenceUrl,
  restrictedExportOrigin,
} from "../core/config";
export const importSchema = z.object({
  source: z.enum(["imports", "overture", "canada"]),
  sourceUrl: z.url().startsWith("https://"),
  license: z.string().min(3).max(500),
  attribution: z.string().min(3).max(500),
  permissionConfirmed: z.literal(true),
  content: z.string().min(1).max(2_000_000),
  format: z.enum(["csv", "jsonl"]),
});
const rowSchema = z.object({
  source_id: z.string().min(1).max(200),
  name: z.string().min(2).max(300),
  country: z.enum(["US", "CA"]),
  region: z.string().min(2).max(10),
  city: z.string().min(1).max(100),
  niche: z.string().min(1).max(100),
  websites: z.string().default(""),
  socials: z.string().default(""),
  emails: z.string().default(""),
  email_source_url: permittedEvidenceUrl.optional().or(z.literal("")),
  operating_status: z
    .enum(["open", "permanently_closed", "temporarily_closed", "unknown"])
    .default("unknown"),
  source_updated_at: z.iso.datetime().optional().or(z.literal("")),
  registration_date: z.iso.date().optional().or(z.literal("")),
  fixture: z.boolean().optional(),
  record_license: z.string().optional(),
});
export function parseImport(
  input: z.infer<typeof importSchema>,
): BusinessRecord[] {
  const raw =
    input.format === "csv"
      ? parse(input.content, {
          columns: true,
          bom: true,
          skip_empty_lines: true,
          max_record_size: 50000,
        })
      : input.content
          .trim()
          .split(/\r?\n/)
          .map((line) => JSON.parse(line));
  if (!Array.isArray(raw) || raw.length > limits().INGEST_BATCH_LIMIT)
    throw new Error("Ingestion batch limit exceeded");
  if (restrictedExportOrigin(input.sourceUrl))
    throw new Error(
      "Restricted provider content cannot be imported into the persistent lead database",
    );
  const now = new Date().toISOString();
  return raw.map((value) => {
    const row = rowSchema.parse(value);
    if (!validRegion(row.country, row.region))
      throw new Error(`Unsupported region ${row.region}`);
    if (
      input.source === "canada" &&
      (row.country !== "CA" || !row.registration_date)
    )
      throw new Error(
        "Canada federal imports require Canada and an official incorporation date",
      );
    if (
      input.source === "overture" &&
      !["CDLA-Permissive-2.0", "Apache-2.0", "CC0-1.0"].includes(
        row.record_license ?? "",
      )
    )
      throw new Error("Overture record licence is missing or unsupported");
    const right: FieldRight = {
      source: input.source,
      url: input.sourceUrl,
      license: row.record_license ?? input.license,
      persist: true,
      export: true,
      attribution: input.attribution,
    };
    const urls = row.websites
      .split("|")
      .filter(Boolean)
      .map((v) => permittedEvidenceUrl.parse(v));
    const emails = row.emails
      .split("|")
      .filter(Boolean)
      .map((v) => z.email().parse(v.trim().toLowerCase()));
    if (emails.length && !row.email_source_url)
      throw new Error(
        "Every imported email requires an exact public source URL",
      );
    if (emails.length && restrictedExportOrigin(row.email_source_url!))
      throw new Error(
        "Restricted provider contact evidence cannot be used for commercial exports",
      );
    return {
      id: randomUUID(),
      source: input.source,
      sourceId: row.source_id,
      name: row.name,
      country: row.country,
      region: row.region,
      city: row.city,
      niche: row.niche,
      websites: urls.filter(independentWebsite),
      socials: [
        ...row.socials.split("|").filter(Boolean),
        ...urls.filter((v) => !independentWebsite(v)),
      ],
      contacts: emails.map((email) => ({
        email,
        sourceUrl: row.email_source_url!,
        foundAt: row.source_updated_at || "",
        binding: "EXACT_BUSINESS",
        rights: { ...right, url: row.email_source_url! },
      })),
      fieldRights: {
        name: right,
        email: { ...right, url: row.email_source_url || input.sourceUrl },
        location: right,
        niche: right,
        website: right,
      },
      evidence:
        row.source_updated_at && row.operating_status === "open"
          ? [
              {
                kind: "activity",
                url: input.sourceUrl,
                observedAt: row.source_updated_at,
                detail:
                  "Dataset open status: single clue only; not independent trading verification",
                source: input.source,
                independent: false,
              },
            ]
          : [],
      operatingStatus: row.operating_status,
      sourceUpdatedAt: row.source_updated_at || undefined,
      importedAt: now,
      registrationDate: row.registration_date || undefined,
      registryId: input.source === "canada" ? row.source_id : undefined,
      fixture: row.fixture ?? false,
    } satisfies BusinessRecord;
  });
}
export async function ingest(ownerId: string, raw: unknown) {
  const input = importSchema.parse(raw);
  const records = parseImport(input);
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        input.source,
        input.sourceUrl,
        input.license,
        input.content,
      ]),
    )
    .digest("hex");
  const db = getDb();
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(ingestionBatches)
      .values({
        id: randomUUID(),
        ownerId,
        digest,
        source: input.source,
        sourceUrl: input.sourceUrl,
        license: input.license,
        count: records.length,
      })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) return { count: 0, duplicateBatch: true };
    let duplicates = 0;
    for (const record of records) {
      const key = identityKey(record);
      const existing = await tx
        .select()
        .from(businesses)
        .where(
          and(eq(businesses.ownerId, ownerId), eq(businesses.identityKey, key)),
        )
        .limit(1);
      if (existing.length) {
        duplicates++;
        const merged = mergeRecords(existing[0].record, record);
        await tx
          .update(businesses)
          .set({
            record: merged,
            updatedAt: new Date(),
            version: sql`${businesses.version}+1`,
          })
          .where(eq(businesses.id, existing[0].id));
      } else
        await tx
          .insert(businesses)
          .values({
            id: record.id,
            ownerId,
            identityKey: key,
            name: record.name,
            country: record.country,
            region: record.region,
            city: record.city,
            niche: record.niche,
            source: record.source,
            sourceId: record.sourceId,
            registrationDate: record.registrationDate,
            record,
          })
          .onConflictDoNothing();
    }
    return { count: records.length, duplicates, duplicateBatch: false };
  });
}
