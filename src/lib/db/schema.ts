import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type {
  BusinessRecord,
  SearchInput,
  Evidence,
  Verification,
} from "../core/types";
const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
export const user = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
});
export const session = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable("accounts", {
  id: text().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: time("access_token_expires_at"),
  refreshTokenExpiresAt: time("refresh_token_expires_at"),
  scope: text(),
  password: text(),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
});
export const verification = pgTable("verifications", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: time("expires_at").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
});
export const jobs = pgTable(
  "search_jobs",
  {
    id: text().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    input: jsonb().$type<SearchInput>().notNull(),
    status: text().notNull().default("QUEUED"),
    stage: text().notNull().default("Waiting for orchestration"),
    discovered: integer().notNull().default(0),
    processed: integer().notNull().default(0),
    qualified: integer().notNull().default(0),
    duplicates: integer().notNull().default(0),
    error: text(),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("job_idempotency_idx").on(t.ownerId, t.idempotencyKey),
    index("job_owner_date_idx").on(t.ownerId, t.createdAt),
  ],
);
export const businesses = pgTable(
  "businesses",
  {
    id: text().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    identityKey: text("identity_key").notNull(),
    name: text().notNull(),
    country: text().notNull(),
    region: text().notNull(),
    city: text().notNull(),
    niche: text().notNull(),
    source: text().notNull(),
    sourceId: text("source_id").notNull(),
    registrationDate: text("registration_date"),
    record: jsonb().$type<BusinessRecord>().notNull(),
    version: integer().notNull().default(0),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_identity_idx").on(t.ownerId, t.identityKey),
    uniqueIndex("business_source_idx").on(t.ownerId, t.source, t.sourceId),
    index("business_geo_idx").on(t.ownerId, t.country, t.region, t.city),
    index("business_registration_idx").on(t.ownerId, t.registrationDate),
  ],
);
export const jobItems = pgTable(
  "job_items",
  {
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    state: text().notNull().default("PENDING"),
    result: jsonb().$type<BusinessRecord>(),
    leaseUntil: time("lease_until"),
    leaseToken: text("lease_token"),
    error: text(),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.businessId] })],
);
export const jobEvents = pgTable(
  "job_events",
  {
    id: text().primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    stage: text().notNull(),
    detail: text().notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("job_event_idx").on(t.jobId, t.createdAt)],
);
export const usage = pgTable(
  "source_usage",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text().notNull(),
    provider: text().notNull(),
    units: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.day, t.provider] })],
);
export const savedLeads = pgTable(
  "saved_leads",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    tags: jsonb().$type<string[]>().notNull().default([]),
    notes: text().notNull().default(""),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.businessId] })],
);
export const suppressions = pgTable(
  "suppression_list",
  {
    id: text().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    reason: text().notNull(),
    emails: jsonb().$type<string[]>().notNull().default([]),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("suppression_identity_idx").on(t.ownerId, t.businessId)],
);
export const exports = pgTable("exports", {
  id: text().primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  count: integer().notNull(),
  skipped: integer().notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const sourceConfigs = pgTable(
  "source_configs",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text().notNull(),
    enabled: boolean().notNull().default(false),
    policy: jsonb()
      .$type<{
        approvedHosts: string[];
        license: string;
        attribution: string;
      }>()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.source] })],
);
export const ingestionBatches = pgTable(
  "ingestion_batches",
  {
    id: text().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    digest: text().notNull(),
    source: text().notNull(),
    sourceUrl: text("source_url").notNull(),
    license: text().notNull(),
    count: integer().notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ingestion_digest_idx").on(t.ownerId, t.digest)],
);
export const evidenceLog = pgTable(
  "verification_evidence",
  {
    id: text().primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    evidence: jsonb().$type<Evidence[]>().notNull(),
    verifications: jsonb().$type<Verification[]>().notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("evidence_business_idx").on(t.businessId, t.createdAt)],
);
export const audit = pgTable("audit_events", {
  id: text().primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: text().notNull(),
  resourceId: text("resource_id").notNull(),
  detail: jsonb().notNull().default({}),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const geoPlaces = pgTable(
  "geo_places",
  {
    id: text().primaryKey(),
    country: text().notNull(),
    region: text().notNull(),
    city: text().notNull(),
    attribution: text().notNull(),
  },
  (t) => [index("geo_lookup_idx").on(t.country, t.region, t.city)],
);
export const quotaCounters = pgTable(
  "quota_counters",
  {
    scope: text().notNull(),
    day: text().notNull(),
    units: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.scope, t.day] })],
);
export const rateLimit = pgTable("rate_limits", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
