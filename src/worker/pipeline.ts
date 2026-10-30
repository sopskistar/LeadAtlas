import { randomUUID } from "node:crypto";
import { and, eq, or, lt, isNull, sql, count } from "drizzle-orm";
import { getDb } from "../lib/db";
import {
  businesses,
  jobs,
  jobItems,
  jobEvents,
  sourceConfigs,
  suppressions,
  evidenceLog,
} from "../lib/db/schema";
import { importedAdapter } from "../lib/providers/registry";
import { rankDomainMatches } from "../lib/core/domain";
import { assess } from "../lib/core/quality";
import { researchWebsite } from "./research";
import { verifyEmail } from "../lib/providers/email";
import { discoveryUrls } from "../lib/providers/brave";
import { sourcedHunterContacts } from "../lib/providers/hunter-discovery";
import { consumeProvider } from "../lib/server/jobs";
import { independentWebsite, normalizeName } from "../lib/core/normalize";
import type { BusinessRecord } from "../lib/core/types";
import { suppressMailboxes } from "../lib/core/suppression";
async function loadJob(id: string) {
  const [job] = await getDb().select().from(jobs).where(eq(jobs.id, id));
  if (!job) throw new Error("Job not found");
  return job;
}
export async function discover(jobId: string) {
  const db = getDb();
  const job = await loadJob(jobId);
  if (["CANCELLED", "COMPLETED"].includes(job.status)) return { ids: [] };
  const old = await db.select().from(jobItems).where(eq(jobItems.jobId, jobId));
  if (old.length) {
    await db
      .update(jobs)
      .set({
        status: "RUNNING",
        stage: "Resuming verification",
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId), sql`${jobs.status} != 'CANCELLED'`));
    return { ids: old.map((i) => i.businessId) };
  }
  const ids: string[] = [];
  for (const source of job.input.sources) {
    const batch = await importedAdapter(
      source as "overture" | "imports" | "canada",
    ).search(job.input, { ownerId: job.ownerId, jobId });
    ids.push(...batch.ids);
    await db.insert(jobEvents).values({
      id: randomUUID(),
      jobId,
      stage: `SOURCE:${source}`,
      detail: `${batch.ids.length} matching permitted source records`,
    });
  }
  const all = [...new Set(ids)];
  let selected = all.slice(0, job.input.limit);
  const matches = new Map<string, BusinessRecord>();
  if (job.input.product === "domains") {
    const candidates: BusinessRecord[] = [];
    for (const id of all) {
      const [row] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, id));
      if (row) candidates.push(row.record);
    }
    for (const domain of job.input.domains ?? [job.input.domain!])
      for (const record of rankDomainMatches(
        domain,
        candidates,
        job.input.domainKind!,
      ))
        if (!matches.has(record.id)) matches.set(record.id, record);
    selected = [...matches.keys()].slice(0, job.input.limit);
  }
  await db.transaction(async (tx) => {
    for (const id of selected)
      await tx
        .insert(jobItems)
        .values({ jobId, businessId: id, result: matches.get(id) })
        .onConflictDoNothing();
    await tx
      .update(jobs)
      .set({
        status: "RUNNING",
        stage: "Verifying businesses, websites and email",
        discovered: selected.length,
        duplicates: ids.length - all.length,
        error: null,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId), sql`${jobs.status} != 'CANCELLED'`));
    await tx.insert(jobEvents).values({
      id: randomUUID(),
      jobId,
      stage: "DISCOVERY",
      detail: `${selected.length} permitted candidates; ${ids.length - all.length} duplicates. ${selected.length ? "Verification pending." : "No imported coverage or no targeted match in the selected location."}`,
    });
  });
  return { ids: selected };
}
export async function processBusiness(jobId: string, businessId: string) {
  const db = getDb();
  const job = await loadJob(jobId);
  if (job.status === "CANCELLED") return { status: "CANCELLED" };
  const [claimed] = await db
    .update(jobItems)
    .set({
      state: "PROCESSING",
      leaseUntil: new Date(Date.now() + 300000),
      leaseToken: randomUUID(),
    })
    .where(
      and(
        eq(jobItems.jobId, jobId),
        eq(jobItems.businessId, businessId),
        or(
          eq(jobItems.state, "PENDING"),
          eq(jobItems.state, "FAILED"),
          and(
            eq(jobItems.state, "PROCESSING"),
            or(
              isNull(jobItems.leaseUntil),
              lt(jobItems.leaseUntil, new Date()),
            ),
          ),
        ),
      ),
    )
    .returning();
  if (!claimed) {
    const [item] = await db
      .select()
      .from(jobItems)
      .where(
        and(eq(jobItems.jobId, jobId), eq(jobItems.businessId, businessId)),
      );
    if (item?.state === "DONE") return { status: "ALREADY_DONE" };
    throw new Error("Business lease held by another worker; retry later");
  }
  try {
    const [row] = await db
      .select()
      .from(businesses)
      .where(
        and(eq(businesses.id, businessId), eq(businesses.ownerId, job.ownerId)),
      );
    if (!row) throw new Error("Business not accessible");
    let record: BusinessRecord = {
      ...row.record,
      domainMatch: claimed.result?.domainMatch,
    };
    const feedback = await db
      .select()
      .from(suppressions)
      .where(eq(suppressions.ownerId, job.ownerId));
    record = suppressMailboxes(
      record,
      new Set(feedback.flatMap((s) => s.emails).map((e) => e.toLowerCase())),
    );
    const [config] = await db
      .select()
      .from(sourceConfigs)
      .where(
        and(
          eq(sourceConfigs.ownerId, job.ownerId),
          eq(sourceConfigs.source, "website"),
        ),
      );
    const consume = (provider: string) =>
      consumeProvider(job.ownerId, jobId, provider);
    if (record.operatingStatus !== "permanently_closed") {
      if (
        !record.websites.some(independentWebsite) &&
        process.env.BRAVE_SEARCH_API_KEY &&
        job.input.queryBudget > 0
      ) {
        try {
          const urls = await discoveryUrls(
            `"${record.name}" "${record.city}" "${record.region}" official business website`,
            consume,
          );
          // Search results are clues, fetched only on approved hosts, never persisted as Brave-derived records.
          const allowed = urls.filter((v) => {
            try {
              return (
                independentWebsite(v) &&
                config?.policy.approvedHosts.includes(new URL(v).hostname)
              );
            } catch {
              return false;
            }
          });
          if (allowed.length && config?.enabled) {
            const researched = await researchWebsite(
              { ...record, websites: allowed },
              config.policy.approvedHosts,
              {
                source: "website",
                url: allowed[0],
                license: config.policy.license,
                persist: true,
                export: true,
                attribution: config.policy.attribution,
              },
            );
            if (researched.website?.status === "OWNED_SITE_FOUND")
              record = { ...researched, websites: [researched.website.url!] };
          }
        } catch {
          record.evidence.push({
            kind: "website",
            source: "research",
            url: record.fieldRights.name.url,
            observedAt: new Date().toISOString(),
            detail:
              "Search failed or budget exhausted; website absence remains uncertain",
          });
        }
      }
      if (config?.enabled)
        record = await researchWebsite(record, config.policy.approvedHosts, {
          source: "website",
          url: record.websites[0] || record.fieldRights.name.url,
          license: config.policy.license,
          persist: true,
          export: true,
          attribution: config.policy.attribution,
        });
      else
        record.website = {
          status: "REVIEW_REQUIRED",
          checkedAt: new Date().toISOString(),
          identity: false,
          functional: false,
          detail:
            "Enable reviewed website host permissions in Sources. Existing licensed emails can still be verified.",
        };
      if (!record.contacts.some((c) => c.binding === "EXACT_BUSINESS")) {
        try {
          const sourced = await sourcedHunterContacts(record, consume);
          record.contacts.push(...sourced);
          if (sourced[0]) record.fieldRights.email = sourced[0].rights;
        } catch {
          /* Optional enrichment failure cannot manufacture contact data. */
        }
      }
      // The website-less path retains licensed public contacts. It never invents mailboxes.
      for (const contact of record.contacts.slice(0, 3))
        if (
          contact.binding === "EXACT_BUSINESS" &&
          contact.verification?.status !== "DO_NOT_MAIL"
        )
          contact.verification = await verifyEmail(contact, consume);
    }
    record.suppressed =
      (
        await db
          .select()
          .from(suppressions)
          .where(
            and(
              eq(suppressions.ownerId, job.ownerId),
              eq(suppressions.businessId, businessId),
            ),
          )
      ).length > 0;
    record.quality = assess(record, job.input.product);
    if ((await loadJob(jobId)).status === "CANCELLED") {
      await db
        .update(jobItems)
        .set({ state: "PENDING", leaseUntil: null, leaseToken: null })
        .where(
          and(
            eq(jobItems.jobId, jobId),
            eq(jobItems.businessId, businessId),
            eq(jobItems.leaseToken, claimed.leaseToken!),
          ),
        );
      return { status: "CANCELLED" };
    }
    await db.transaction(async (tx) => {
      const completed = await tx
        .update(jobItems)
        .set({
          state: "DONE",
          result: record,
          error: null,
          leaseUntil: null,
          leaseToken: null,
        })
        .where(
          and(
            eq(jobItems.jobId, jobId),
            eq(jobItems.businessId, businessId),
            eq(jobItems.leaseToken, claimed.leaseToken!),
            eq(jobItems.state, "PROCESSING"),
          ),
        )
        .returning({ id: jobItems.businessId });
      if (!completed.length)
        throw new Error(
          "Work lease was superseded; stale worker cannot commit",
        );
      const changed = await tx
        .update(businesses)
        .set({
          record,
          updatedAt: new Date(),
          version: sql`${businesses.version}+1`,
        })
        .where(
          and(
            eq(businesses.id, businessId),
            eq(businesses.version, row.version),
          ),
        )
        .returning({ id: businesses.id });
      if (!changed.length)
        throw new Error(
          "Business evidence changed during research; retry from current data",
        );
      await tx.insert(evidenceLog).values({
        id: randomUUID(),
        businessId,
        jobId,
        evidence: record.evidence,
        verifications: record.contacts.flatMap((c) =>
          c.verification ? [c.verification] : [],
        ),
      });
      await tx
        .update(jobs)
        .set({
          processed: sql`${jobs.processed}+1`,
          qualified: sql`${jobs.qualified}+${record.quality!.status === "QUALIFIED" ? 1 : 0}`,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, jobId));
    });
    return { status: record.quality.status };
  } catch (error) {
    await db
      .update(jobItems)
      .set({
        state: "FAILED",
        leaseUntil: null,
        leaseToken: null,
        error: error instanceof Error ? error.message : "Failed",
      })
      .where(
        and(
          eq(jobItems.jobId, jobId),
          eq(jobItems.businessId, businessId),
          eq(jobItems.leaseToken, claimed.leaseToken!),
          eq(jobItems.state, "PROCESSING"),
        ),
      );
    throw error;
  }
}
export async function finish(jobId: string) {
  const db = getDb();
  const job = await loadJob(jobId);
  if (job.status === "CANCELLED") return { status: "CANCELLED" };
  const [pending] = await db
    .select({ n: count() })
    .from(jobItems)
    .where(and(eq(jobItems.jobId, jobId), sql`${jobItems.state} != 'DONE'`));
  if (pending.n) throw new Error("Job still has incomplete items");
  await db
    .update(jobs)
    .set({ status: "COMPLETED", stage: "Complete", updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), sql`${jobs.status} != 'CANCELLED'`));
  return { status: "COMPLETED" };
}
export const normalizedJobName = normalizeName;
