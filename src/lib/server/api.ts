import { randomUUID } from "node:crypto";
import { and, eq, desc, sql, count, ilike } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  jobs,
  businesses,
  jobItems,
  jobEvents,
  savedLeads,
  suppressions,
  exports,
  sourceConfigs,
  audit,
  geoPlaces,
  quotaCounters,
  user,
} from "../db/schema";
import { getAuth, authConfigured } from "./auth";
import { createJob, jobsConfigured, consumeProvider } from "./jobs";
import { inngest } from "./inngest";
import { sourceRegistry, escapeLike } from "../providers/registry";
import { googlePlaceIds, metaKnownProfile } from "../providers/restricted";
import { ingest } from "./imports";
import { qualifiedCsv } from "../core/csv";
import { assess } from "../core/quality";
import { independentWebsite } from "../core/normalize";
import type { BusinessRecord, Product } from "../core/types";
import { suppressMailboxes } from "../core/suppression";
import { isAdmin } from "./access";
import { emailConfigured } from "./email";
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function admin(id: string) {
  if (
    !(process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .includes(id)
  )
    throw new ApiError(
      403,
      "Administrator access is required for source rights and ingestion.",
    );
}
async function body(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 2_100_000)
    throw new ApiError(413, "Request too large");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "JSON body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_100_000) {
      await reader.cancel();
      throw new ApiError(413, "Request too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function provisionedOwner(actorId: string, raw: unknown) {
  const { targetEmail } = z
    .object({ targetEmail: z.email().optional().or(z.literal("")) })
    .parse(raw);
  if (!targetEmail) return actorId;
  const [target] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, targetEmail.toLowerCase()))
    .limit(1);
  if (!target) throw new ApiError(404, "Workspace account not found");
  return target.id;
}
async function refreshSnapshots(
  db: Pick<ReturnType<typeof getDb>, "select" | "update">,
  record: BusinessRecord,
  ownerId: string,
) {
  const snapshots = await db
    .select({
      jobId: jobItems.jobId,
      result: jobItems.result,
      input: jobs.input,
    })
    .from(jobItems)
    .innerJoin(jobs, eq(jobItems.jobId, jobs.id))
    .where(
      and(
        eq(jobItems.businessId, record.id),
        eq(jobs.ownerId, ownerId),
        eq(jobItems.state, "DONE"),
      ),
    );
  for (const snapshot of snapshots) {
    const result = { ...record, domainMatch: snapshot.result?.domainMatch };
    result.quality = assess(result, snapshot.input.product);
    await db
      .update(jobItems)
      .set({ result })
      .where(
        and(
          eq(jobItems.jobId, snapshot.jobId),
          eq(jobItems.businessId, record.id),
        ),
      );
  }
}
async function ownedJob(id: string, ownerId: string) {
  const [job] = await getDb()
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.ownerId, ownerId)));
  if (!job) throw new ApiError(404, "Search not found");
  return job;
}
async function ownedBusiness(id: string, ownerId: string) {
  const [row] = await getDb()
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, id), eq(businesses.ownerId, ownerId)));
  if (!row) throw new ApiError(404, "Business not found");
  return row;
}
export async function handleApi(req: Request, segments: string[]) {
  try {
    const url = new URL(req.url);
    const path = segments.join("/");
    if (req.method === "GET" && path === "status")
      return json({
        auth: authConfigured(),
        registration:
          authConfigured() &&
          (process.env.NODE_ENV !== "production" || emailConfigured()),
        recovery: authConfigured() && emailConfigured(),
        search:
          authConfigured() && jobsConfigured() && !!process.env.HUNTER_API_KEY,
      });
    if (!authConfigured())
      throw new ApiError(
        503,
        "Account services are temporarily unavailable. Please try again later.",
      );
    const identity = await getAuth().api.getSession({ headers: req.headers });
    if (req.method === "GET" && path === "session")
      return json({
        user: identity?.user ?? null,
        isAdmin: !!identity && isAdmin(identity.user.id),
      });
    if (!identity)
      throw new ApiError(401, "Sign in to use your LeadAtlas workspace.");
    if (!["GET", "HEAD"].includes(req.method)) {
      const origin = req.headers.get("origin");
      if (origin !== new URL(process.env.BETTER_AUTH_URL!).origin)
        throw new ApiError(403, "Origin check failed");
    }
    const ownerId = identity.user.id;
    const db = getDb();
    const page = Math.max(
      1,
      Math.min(10000, Number(url.searchParams.get("page") ?? 1) || 1),
    );
    const pageSize = 25;
    if (req.method === "GET" && path === "sources") {
      admin(ownerId);
      const configs = await db
        .select()
        .from(sourceConfigs)
        .where(eq(sourceConfigs.ownerId, ownerId));
      const usage = await db
        .select()
        .from(quotaCounters)
        .where(sql`${quotaCounters.scope} IN (${`owner:${ownerId}`})`);
      return json({ sources: sourceRegistry(), configs, usage });
    }
    if (req.method === "GET" && path === "admin/status") {
      admin(ownerId);
      return json({
        auth: authConfigured(),
        database: !!process.env.DATABASE_URL,
        orchestration: jobsConfigured(),
        verifier: !!process.env.HUNTER_API_KEY,
        email: emailConfigured(),
        sources: sourceRegistry(),
      });
    }
    if (req.method === "GET" && path === "cities") {
      const rows = await db
        .select({ city: geoPlaces.city })
        .from(geoPlaces)
        .where(
          and(
            eq(geoPlaces.country, url.searchParams.get("country") ?? "US"),
            eq(geoPlaces.region, url.searchParams.get("region") ?? "NY"),
            ilike(
              geoPlaces.city,
              `${escapeLike(url.searchParams.get("q") ?? "")}%`,
            ),
          ),
        )
        .limit(30);
      return json({
        cities: rows.map((r) => r.city),
        coverageNote:
          "Reference suggestions only. Any city can be entered; source coverage varies.",
      });
    }
    if (req.method === "GET" && path === "dashboard") {
      const [searches] = await db
        .select({ value: count() })
        .from(jobs)
        .where(eq(jobs.ownerId, ownerId));
      const [candidates] = await db
        .select({ value: count() })
        .from(businesses)
        .where(eq(businesses.ownerId, ownerId));
      const [saved] = await db
        .select({ value: count() })
        .from(savedLeads)
        .where(eq(savedLeads.ownerId, ownerId));
      const [downloads] = await db
        .select({ value: count() })
        .from(exports)
        .where(eq(exports.ownerId, ownerId));
      const coverage = await db
        .select({
          country: businesses.country,
          region: businesses.region,
          city: businesses.city,
          count: count(),
        })
        .from(businesses)
        .where(eq(businesses.ownerId, ownerId))
        .groupBy(businesses.country, businesses.region, businesses.city)
        .limit(100);
      return json({
        searches: searches.value,
        candidates: candidates.value,
        saved: saved.value,
        exports: downloads.value,
        coverage,
      });
    }
    if (req.method === "GET" && path === "jobs")
      return json({
        jobs: await db
          .select()
          .from(jobs)
          .where(eq(jobs.ownerId, ownerId))
          .orderBy(desc(jobs.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        page,
      });
    if (req.method === "POST" && path === "jobs") {
      if (!jobsConfigured())
        throw new ApiError(
          503,
          "Search is temporarily unavailable. Please try again later.",
        );
      const job = await createJob(
        ownerId,
        await body(req),
        req.headers.get("idempotency-key") ?? "",
      );
      if (job.status === "QUEUED") {
        try {
          await inngest.send({
            id: job.id,
            name: "leadatlas/search.requested",
            data: { jobId: job.id, ownerId },
          });
        } catch {
          await db
            .update(jobs)
            .set({
              status: "DISPATCH_FAILED",
              error:
                "Job persisted but Inngest dispatch failed. Retry after checking configuration.",
            })
            .where(eq(jobs.id, job.id));
          return json(
            {
              jobId: job.id,
              error: "Job saved; dispatch failed. Retry from search details.",
            },
            202,
          );
        }
      }
      return json({ jobId: job.id }, 201);
    }
    if (segments[0] === "jobs" && segments[1]) {
      const job = await ownedJob(segments[1], ownerId);
      if (req.method === "GET" && segments.length === 2) {
        const quality = url.searchParams.get("quality") ?? "QUALIFIED";
        const filters = [eq(jobItems.jobId, job.id)];
        if (quality !== "ALL")
          filters.push(
            sql`${jobItems.result}->'quality'->>'status' = ${quality}`,
          );
        const items = await db
          .select()
          .from(jobItems)
          .where(and(...filters))
          .orderBy(jobItems.businessId)
          .limit(pageSize)
          .offset((page - 1) * pageSize);
        const events = await db
          .select()
          .from(jobEvents)
          .where(eq(jobEvents.jobId, job.id))
          .orderBy(desc(jobEvents.createdAt))
          .limit(20);
        const breakdown = await db
          .select({
            state: sql<string>`${jobItems.result}->'quality'->>'status'`,
            count: count(),
          })
          .from(jobItems)
          .where(eq(jobItems.jobId, job.id))
          .groupBy(sql`${jobItems.result}->'quality'->>'status'`);
        return json({
          job,
          records: items
            .flatMap((i) =>
              i.result
                ? [
                    {
                      ...i.result,
                      quality: assess(i.result, job.input.product),
                    },
                  ]
                : [],
            )
            .filter((r) => quality === "ALL" || r.quality.status === quality),
          events,
          breakdown,
          page,
        });
      }
      if (req.method === "POST" && segments[2] === "cancel") {
        if (job.status === "COMPLETED")
          throw new ApiError(409, "Completed searches cannot be cancelled");
        await db
          .update(jobs)
          .set({
            status: "CANCELLED",
            stage: "Cancelled by owner",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(jobs.id, job.id),
              sql`${jobs.status} NOT IN ('COMPLETED','CANCELLED')`,
            ),
          );
        try {
          await inngest.send({
            name: "leadatlas/search.cancelled",
            data: { jobId: job.id },
          });
        } catch {
          /* Worker checks persisted cancellation before every item and before commit. */
        }
        return json({ status: "CANCELLED" });
      }
      if (req.method === "POST" && segments[2] === "retry") {
        if (!jobsConfigured())
          throw new ApiError(
            503,
            "Search is temporarily unavailable. Please try again later.",
          );
        const [retry] = await db
          .update(jobs)
          .set({
            status: "QUEUED",
            error: null,
            stage: "Retry queued",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(jobs.id, job.id),
              sql`${jobs.status} IN ('FAILED','CANCELLED','DISPATCH_FAILED')`,
            ),
          )
          .returning();
        if (!retry)
          throw new ApiError(
            409,
            "Only failed or cancelled searches can be resumed",
          );
        try {
          await inngest.send({
            id: `${job.id}-${randomUUID()}`,
            name: "leadatlas/search.requested",
            data: { jobId: job.id, ownerId },
          });
        } catch {
          await db
            .update(jobs)
            .set({ status: "DISPATCH_FAILED", error: "Retry dispatch failed" })
            .where(eq(jobs.id, job.id));
          throw new ApiError(503, "Retry dispatch failed; job remains saved");
        }
        return json({ status: "QUEUED" });
      }
      if (req.method === "POST" && segments[2] === "export") {
        // Re-assess current records at export; never trust a historical QUALIFIED label.
        const rows = await db
          .select({
            record: businesses.record,
            result: jobItems.result,
            suppression: suppressions.reason,
          })
          .from(jobItems)
          .innerJoin(businesses, eq(jobItems.businessId, businesses.id))
          .leftJoin(
            suppressions,
            and(
              eq(suppressions.businessId, businesses.id),
              eq(suppressions.ownerId, ownerId),
            ),
          )
          .where(
            and(eq(jobItems.jobId, job.id), eq(businesses.ownerId, ownerId)),
          )
          .limit(100);
        const blocked = await db
          .select()
          .from(suppressions)
          .where(eq(suppressions.ownerId, ownerId));
        const addresses = new Set(
          blocked.flatMap((s) => s.emails).map((e) => e.toLowerCase()),
        );
        const records = rows.map((r) =>
          suppressMailboxes(
            {
              ...r.record,
              domainMatch: r.result?.domainMatch,
              suppressed: !!r.suppression,
            },
            addresses,
          ),
        );
        const output = qualifiedCsv(records, job.input.product);
        await db.insert(exports).values({
          id: randomUUID(),
          ownerId,
          jobId: job.id,
          count: output.count,
          skipped: output.skipped,
        });
        return new Response(output.csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="leadatlas-qualified.csv"',
            "Cache-Control": "no-store",
            "X-Exported-Count": String(output.count),
            "X-Skipped-Count": String(output.skipped),
          },
        });
      }
    }
    if (req.method === "GET" && path === "leads") {
      const filters = [eq(businesses.ownerId, ownerId)];
      if (url.searchParams.get("q"))
        filters.push(
          ilike(businesses.name, `%${escapeLike(url.searchParams.get("q")!)}%`),
        );
      if (url.searchParams.get("city"))
        filters.push(
          ilike(businesses.city, escapeLike(url.searchParams.get("city")!)),
        );
      if (url.searchParams.get("source"))
        filters.push(eq(businesses.source, url.searchParams.get("source")!));
      if (
        url.searchParams.get("quality") &&
        url.searchParams.get("quality") !== "ALL"
      )
        filters.push(
          sql`${businesses.record}->'quality'->>'status' = ${url.searchParams.get("quality")}`,
        );
      const rows = await db
        .select({
          record: businesses.record,
          tags: savedLeads.tags,
          notes: savedLeads.notes,
        })
        .from(savedLeads)
        .innerJoin(businesses, eq(savedLeads.businessId, businesses.id))
        .where(and(eq(savedLeads.ownerId, ownerId), ...filters))
        .orderBy(desc(savedLeads.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return json({
        records: rows.map((r) => ({
          ...r.record,
          tags: r.tags,
          notes: r.notes,
        })),
        page,
      });
    }
    if (req.method === "GET" && path === "exports")
      return json({
        exports: await db
          .select()
          .from(exports)
          .where(eq(exports.ownerId, ownerId))
          .orderBy(desc(exports.createdAt))
          .limit(50),
      });
    if (req.method === "POST" && path === "imports") {
      admin(ownerId);
      const raw = await body(req);
      const targetId = await provisionedOwner(ownerId, raw);
      const result = await ingest(targetId, raw);
      await db.insert(audit).values({
        id: randomUUID(),
        ownerId,
        action: "workspace_data_provisioned",
        resourceId: targetId,
        detail: { count: result.count },
      });
      return json(result, 201);
    }
    if (req.method === "POST" && path === "sources/website") {
      admin(ownerId);
      const raw = await body(req);
      const targetId = await provisionedOwner(ownerId, raw);
      const config = z
        .object({
          enabled: z.boolean(),
          approvedHosts: z
            .array(
              z
                .string()
                .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
            )
            .max(100),
          license: z.string().min(3).max(500),
          attribution: z.string().min(3).max(500),
          permissionConfirmed: z.literal(true),
        })
        .parse(raw);
      await db
        .insert(sourceConfigs)
        .values({
          ownerId: targetId,
          source: "website",
          enabled: config.enabled,
          policy: {
            approvedHosts: config.approvedHosts,
            license: config.license,
            attribution: config.attribution,
          },
        })
        .onConflictDoUpdate({
          target: [sourceConfigs.ownerId, sourceConfigs.source],
          set: { enabled: config.enabled, policy: config },
        });
      await db.insert(audit).values({
        id: randomUUID(),
        ownerId,
        action: "source_rights_updated",
        resourceId: "website",
        detail: { hosts: config.approvedHosts, targetOwnerId: targetId },
      });
      return json({ updated: true });
    }
    if (req.method === "POST" && path === "sources/test") {
      admin(ownerId);
      const data = z
        .object({
          source: z.enum(["facebook", "instagram", "google"]),
          identifier: z.string().min(1).max(200),
          jobId: z.uuid(),
        })
        .parse(await body(req));
      await ownedJob(data.jobId, ownerId);
      await consumeProvider(ownerId, data.jobId, data.source);
      const result =
        data.source === "google"
          ? {
              placeIds: await googlePlaceIds(data.identifier),
              exportAllowed: false,
            }
          : await metaKnownProfile(data.source, data.identifier);
      return json(result);
    }
    if (segments[0] === "leads" && segments[1] && req.method === "POST") {
      const row = await ownedBusiness(segments[1], ownerId);
      if (segments[2] === "save") {
        const data = z
          .object({
            tags: z
              .array(
                z.enum([
                  "website_service",
                  "domain_prospect",
                  "ai_receptionist_possible",
                  "general_lead",
                ]),
              )
              .max(4)
              .default([]),
            notes: z.string().max(5000).default(""),
          })
          .parse(await body(req));
        await db
          .insert(savedLeads)
          .values({ ownerId, businessId: row.id, ...data })
          .onConflictDoUpdate({
            target: [savedLeads.ownerId, savedLeads.businessId],
            set: data,
          });
        return json({ saved: true });
      }
      if (segments[2] === "remove") {
        await db
          .delete(savedLeads)
          .where(
            and(
              eq(savedLeads.ownerId, ownerId),
              eq(savedLeads.businessId, row.id),
            ),
          );
        return json({ removed: true });
      }
      if (segments[2] === "suppress") {
        const data = z
          .object({
            reason: z.enum([
              "closed",
              "bounced",
              "wrong_business",
              "wrong_email",
              "opt_out",
            ]),
          })
          .parse(await body(req));
        await db.transaction(async (tx) => {
          await tx
            .insert(suppressions)
            .values({
              id: randomUUID(),
              ownerId,
              businessId: row.id,
              reason: data.reason,
              emails: ["opt_out", "bounced", "wrong_email"].includes(
                data.reason,
              )
                ? row.record.contacts.map((c) => c.email.toLowerCase())
                : [],
            })
            .onConflictDoUpdate({
              target: [suppressions.ownerId, suppressions.businessId],
              set: {
                reason: data.reason,
                emails: sql`${suppressions.emails} || ${JSON.stringify(["opt_out", "bounced", "wrong_email"].includes(data.reason) ? row.record.contacts.map((c) => c.email.toLowerCase()) : [])}::jsonb`,
              },
            });
          const record = { ...row.record, suppressed: true };
          record.quality = assess(record, "contacts");
          await tx
            .update(businesses)
            .set({
              record,
              updatedAt: new Date(),
              version: sql`${businesses.version}+1`,
            })
            .where(eq(businesses.id, row.id));
          await refreshSnapshots(tx, record, ownerId);
          await tx.insert(audit).values({
            id: randomUUID(),
            ownerId,
            action: "business_suppressed",
            resourceId: row.id,
            detail: data,
          });
        });
        return json({ suppressed: true });
      }
      if (segments[2] === "review") {
        const data = z
          .object({
            product: z.enum(["contacts", "opportunities", "domains", "new"]),
            evidence: z
              .array(
                z.object({
                  kind: z.enum([
                    "activity",
                    "closure",
                    "temporary_closure",
                    "absence",
                  ]),
                  url: z.url().startsWith("https://"),
                  observedAt: z.iso.datetime(),
                  detail: z.string().min(20).max(1000),
                }),
              )
              .min(1)
              .max(5),
            attested: z.literal(true),
          })
          .parse(await body(req));
        const record: BusinessRecord = {
          ...row.record,
          evidence: [
            ...row.record.evidence,
            ...data.evidence.map((e) => ({
              ...e,
              source: "user_review",
              independent: true,
            })),
          ],
        };
        if (
          data.evidence.some((e) => e.kind === "absence") &&
          !record.websites.some(independentWebsite)
        )
          record.website = {
            status: record.socials.length
              ? "SOCIAL_ONLY"
              : "NO_OWNED_SITE_FOUND",
            checkedAt: new Date().toISOString(),
            identity: false,
            functional: false,
            detail:
              "No website found after user-documented research; inference, not proof",
          };
        record.quality = assess(record, data.product as Product);
        await db.transaction(async (tx) => {
          await tx
            .update(businesses)
            .set({
              record,
              updatedAt: new Date(),
              version: sql`${businesses.version}+1`,
            })
            .where(eq(businesses.id, row.id));
          await refreshSnapshots(tx, record, ownerId);
          await tx.insert(audit).values({
            id: randomUUID(),
            ownerId,
            action: "manual_evidence_review",
            resourceId: row.id,
            detail: data,
          });
        });
        return json({ record });
      }
    }
    if (req.method === "POST" && path === "account/delete") {
      const data = z
        .object({ confirmation: z.literal("DELETE MY ACCOUNT") })
        .parse(await body(req));
      if (data.confirmation) {
        const { user } = await import("../db/schema");
        await db.delete(user).where(eq(user.id, ownerId));
      }
      return json({ deleted: true });
    }
    throw new ApiError(404, "API route not found");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues.map((i) => i.message).join("; ") },
        400,
      );
    if (error instanceof SyntaxError)
      return json({ error: "Invalid JSON request" }, 400);
    const message = error instanceof Error ? error.message : "";
    if (
      /budget|quota|Idempotency|batch|licen[cs]e|require|unsupported|configured/i.test(
        message,
      )
    )
      return json({ error: message }, 400);
    console.error("LeadAtlas API request failed", {
      path: segments.join("/"),
      kind: error instanceof Error ? error.name : "unknown",
    });
    return json(
      {
        error:
          "This service is temporarily unavailable. Please try again later.",
      },
      503,
    );
  }
}
