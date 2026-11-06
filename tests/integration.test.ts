import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { page } from "./fixtures/business";
let database: ReturnType<typeof drizzle<typeof schema>>;
const client = new PGlite();
const authTasks = vi.hoisted(() => ({ pending: [] as Promise<unknown>[] }));
vi.mock("next/server", () => ({
  after: (task: Promise<unknown>) => {
    authTasks.pending.push(task);
  },
}));
vi.mock("@/lib/db", () => ({ getDb: () => database }));
vi.mock("@/lib/server/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["test-event"] }) },
}));
vi.mock("../src/worker/safe-fetch", () => ({
  safeFetch: vi.fn(async (url: string) => ({
    status: 200,
    url,
    body: url.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : page,
    contentType: url.endsWith("robots.txt") ? "text/plain" : "text/html",
  })),
}));
vi.mock("node:dns/promises", () => ({
  resolveMx: vi.fn().mockResolvedValue([{ exchange: "mx.test", priority: 10 }]),
}));
import { getAuth } from "../src/lib/server/auth";
import { handleApi } from "../src/lib/server/api";
import { discover, processBusiness, finish } from "../src/worker/pipeline";
import { requestDiscovery } from "../src/worker/discovery-task";
import { createJob, consumeProvider } from "../src/lib/server/jobs";
import { safeFetch } from "../src/worker/safe-fetch";
let cookie = "";
let ownerId = "";
const base = "http://localhost:3000";
let fixtureAddress = 1;
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  customCookie = cookie,
  headers: Record<string, string> = {},
) {
  return handleApi(
    new Request(base + "/api/" + path, {
      method,
      headers: {
        Origin: base,
        Cookie: customCookie,
        "Content-Type": "application/json",
        ...headers,
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    }),
    new URL("http://localhost/api/" + path).pathname
      .split("/")
      .filter(Boolean)
      .slice(1),
  );
}
async function signup(email: string) {
  const res = await getAuth().handler(
    new Request(base + "/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        "X-Forwarded-For": `203.0.113.${fixtureAddress++}`,
      },
      body: JSON.stringify({
        name: "TEST account",
        email,
        password: "Strong-Test-Password-2026",
      }),
    }),
  );
  expect(res.status, await res.clone().text()).toBe(200);
  const body = await res.json();
  return {
    id: body.user.id as string,
    cookie: res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
beforeAll(async () => {
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await client.exec(await readFile(`drizzle/${file}`, "utf8"));
  database = drizzle(client, { schema });
  vi.stubEnv("DATABASE_URL", "postgres://test-only/no-external-database");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-only-secret-not-for-production-123456789",
  );
  vi.stubEnv("BETTER_AUTH_URL", base);
  vi.stubEnv("WORKER_URL", "http://localhost:4000");
  vi.stubEnv("WORKER_SECRET", "worker-test-secret-12345678901234567890");
  vi.stubEnv("INNGEST_EVENT_KEY", "fixture-event-key");
  vi.stubEnv("INNGEST_SIGNING_KEY", "fixture-signing-key");
  vi.stubEnv("HUNTER_API_KEY", "fixture-verifier-key");
  vi.stubEnv("BRAVE_SEARCH_API_KEY", "");
  vi.stubEnv("RESEND_API_KEY", "fixture-email-key");
  vi.stubEnv("AUTH_EMAIL_FROM", "LeadAtlas <auth@test.example>");
  vi.stubEnv("AUTH_EMAIL_SENDER_VERIFIED", "true");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      if (String(input) === "https://api.resend.com/emails")
        return Response.json({ id: "fixture-accepted-message" });
      if (String(input).startsWith("https://api.hunter.io/v2/email-verifier"))
        return Response.json({
          data: {
            status: "valid",
            verification: { date: new Date().toISOString() },
          },
        });
      throw new Error("Unexpected external request in deterministic test");
    }),
  );
  const account = await signup("owner@test.example");
  cookie = account.cookie;
  ownerId = account.id;
  vi.stubEnv("ADMIN_USER_IDS", ownerId);
}, 30000);
afterAll(async () => {
  await Promise.all(authTasks.pending);
  await client.close();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function importRow(name: string, extra: Record<string, string> = {}) {
  const response = await request("imports", "POST", {
    source: "imports",
    sourceUrl: "https://directory.example/dataset",
    license: "TEST-ONLY authorized fixture licence",
    attribution: "TEST FIXTURE ONLY - isolated test database",
    permissionConfirmed: true,
    format: "jsonl",
    content: JSON.stringify({
      source_id: name,
      name,
      country: "US",
      region: "NY",
      city: "New York",
      niche: "plumber",
      websites: "https://alpha.example",
      emails: "hello@alpha.example",
      email_source_url: "https://directory.example/alpha",
      operating_status: "open",
      source_updated_at: new Date().toISOString(),
      ...extra,
    }),
  });
  expect(response.status, await response.clone().text()).toBe(201);
  return (
    await database
      .select()
      .from(schema.businesses)
      .where(
        and(
          eq(schema.businesses.ownerId, ownerId),
          eq(schema.businesses.name, name),
        ),
      )
  )[0];
}
async function attest(id: string, kind = "activity") {
  const now = new Date().toISOString();
  const result = await request(`leads/${id}/review`, "POST", {
    product: kind === "absence" ? "opportunities" : "contacts",
    attested: true,
    evidence: [
      {
        kind,
        url: "https://independent-a.example/business",
        observedAt: now,
        detail: "TEST independently reviewed current public business evidence",
      },
      {
        kind,
        url: "https://independent-b.example/business",
        observedAt: now,
        detail: "TEST second independent public business evidence",
      },
    ],
  });
  expect(result.status, await result.clone().text()).toBe(200);
}
describe("persisted account → permitted import → worker → qualified CSV", () => {
  it("reclaims an expired item lease and counts completion once", async () => {
    const row = await importRow("Lease Fixture Plumbing", {
      websites: "",
      emails: "",
      niche: "lease-only",
    });
    const job = await createJob(
      ownerId,
      {
        product: "contacts",
        country: "US",
        region: "NY",
        city: "New York",
        niche: "lease-only",
        sources: ["imports"],
        limit: 1,
        queryBudget: 0,
      },
      "test-expired-lease-001",
    );
    await database.insert(schema.jobItems).values({
      jobId: job.id,
      businessId: row.id,
      state: "PROCESSING",
      leaseToken: "old-worker",
      leaseUntil: new Date(Date.now() + 60000),
    });
    await expect(processBusiness(job.id, row.id)).rejects.toThrow("lease held");
    await database
      .update(schema.jobItems)
      .set({ leaseUntil: new Date(Date.now() - 1000) })
      .where(eq(schema.jobItems.jobId, job.id));
    await processBusiness(job.id, row.id);
    await processBusiness(job.id, row.id);
    const [done] = await database
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, job.id));
    expect(done.processed).toBe(1);
  });
  it("real Better Auth sessions protect APIs and passwords are stored hashed", async () => {
    expect((await request("dashboard", "GET", undefined, "")).status).toBe(401);
    const response = await request("session");
    expect((await response.json()).user.id).toBe(ownerId);
    const [account] = await database
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, ownerId));
    expect(account.password).not.toBe("Strong-Test-Password-2026");
    expect(account.password!.length).toBeGreaterThan(50);
  });
  it("creates a real search job, persists evidence, verifies with fixture transport and exports", async () => {
    const record = await importRow("Alpha Plumbing");
    expect(record.record.contacts[0].verification).toBeUndefined();
    await attest(record.id);
    const permission = await request("sources/website", "POST", {
      enabled: true,
      approvedHosts: ["alpha.example"],
      license: "TEST-only explicit website permission",
      attribution: "TEST fixture website",
      permissionConfirmed: true,
    });
    expect(permission.status).toBe(200);
    const input = {
      product: "contacts",
      country: "US",
      region: "NY",
      city: "New York",
      niche: "plumber",
      sources: ["imports"],
      limit: 10,
      queryBudget: 10,
    };
    const key = "test-idempotency-contacts-0001";
    const response = await request("jobs", "POST", input, cookie, {
      "Idempotency-Key": key,
    });
    expect(response.status, await response.clone().text()).toBe(201);
    const { jobId: id } = await response.json();
    const repeated = await request("jobs", "POST", input, cookie, {
      "Idempotency-Key": key,
    });
    expect((await repeated.json()).jobId).toBe(id);
    expect(
      await database.select().from(schema.jobs).where(eq(schema.jobs.id, id)),
    ).toHaveLength(1);
    const discovery = await discover(id);
    expect(discovery.ids).toHaveLength(1);
    await processBusiness(id, record.id);
    expect((await processBusiness(id, record.id)).status).toBe("ALREADY_DONE");
    await finish(id);
    const details = await (await request(`jobs/${id}`)).json();
    expect(details.job.status).toBe("COMPLETED");
    expect(details.job.processed).toBe(1);
    expect(details.records[0].quality.status).toBe("QUALIFIED");
    expect(details.records[0].discoveredBy).toEqual(["imports"]);
    expect(details.sources).toMatchObject([
      {
        source: "imports",
        adapterVersion: "1",
        status: "COMPLETED",
        discoveredCount: 1,
        uniqueCount: 1,
      },
    ]);
    const output = await request(`jobs/${id}/export`, "POST", {});
    expect(output.headers.get("X-Exported-Count")).toBe("1");
    expect(await output.text()).toBe(
      "Business Name,Email\r\nAlpha Plumbing,hello@alpha.example\r\n",
    );
    await request(`leads/${record.id}/save`, "POST", {
      tags: ["general_lead"],
      notes: "TEST note",
    });
    expect((await (await request("leads")).json()).records).toHaveLength(1);
    await request(`leads/${record.id}/suppress`, "POST", { reason: "bounced" });
    expect(
      (await request(`jobs/${id}/export`, "POST", {})).headers.get(
        "X-Exported-Count",
      ),
    ).toBe("0");
  });
  it("keeps social-only businesses on the separate licensed-email pathway", async () => {
    const row = await importRow("Beta Plumbing", {
      websites: "https://facebook.com/betafixture",
      emails: "office@beta.example",
      email_source_url: "https://directory.example/beta",
    });
    await attest(row.id);
    await attest(row.id, "absence");
    const job = await createJob(
      ownerId,
      {
        product: "opportunities",
        country: "US",
        region: "NY",
        city: "New York",
        niche: "plumber",
        sources: ["imports"],
        limit: 10,
        queryBudget: 10,
      },
      "test-opportunity-id-00001",
    );
    await discover(job.id);
    await processBusiness(job.id, row.id);
    const [item] = await database
      .select()
      .from(schema.jobItems)
      .where(
        and(
          eq(schema.jobItems.jobId, job.id),
          eq(schema.jobItems.businessId, row.id),
        ),
      );
    expect(item.result!.website!.status).toBe("SOCIAL_ONLY");
    expect(item.result!.quality!.status).toBe("QUALIFIED");
  });
  it("handles Canadian federal incorporation records without claiming trading activity", async () => {
    const response = await request("imports", "POST", {
      source: "canada",
      sourceUrl:
        "https://ised-isde.canada.ca/site/corporations-canada/en/data-services",
      license: "Open Government Licence – Canada (TEST FIXTURE)",
      attribution: "TEST ONLY Canadian federal filing fixture",
      permissionConfirmed: true,
      format: "jsonl",
      content: JSON.stringify({
        source_id: "TEST-CA-001",
        name: "Canadian Test Company",
        country: "CA",
        region: "ON",
        city: "Toronto",
        niche: "registry",
        registration_date: "2026-10-15",
      }),
    });
    expect(response.status).toBe(201);
    const job = await createJob(
      ownerId,
      {
        product: "new",
        country: "CA",
        region: "ON",
        city: "Toronto",
        niche: "*",
        sources: ["canada"],
        limit: 10,
        queryBudget: 0,
        since: "2026-10-01",
        until: "2026-10-30",
      },
      "test-canada-registry-001",
    );
    const found = await discover(job.id);
    expect(found.ids).toHaveLength(1);
    await processBusiness(job.id, found.ids[0]);
    const [item] = await database
      .select()
      .from(schema.jobItems)
      .where(eq(schema.jobItems.jobId, job.id));
    expect(item.result!.quality!.activity).toBe("UNKNOWN");
    expect(item.result!.quality!.status).not.toBe("QUALIFIED");
  });
  it("resumes legacy regional domain jobs without rewriting their stored inputs", async () => {
    await importRow("Oceanwise", {
      websites: "https://getoceanwise.com",
      emails: "hello@getoceanwise.com",
    });
    const job = await createJob(
      ownerId,
      {
        product: "domains",
        country: "US",
        region: "NY",
        city: "New York",
        niche: "*",
        sources: ["imports"],
        limit: 10,
        queryBudget: 0,
        domain: "oceanwise.com",
        domainKind: "brandable",
        ownershipAffirmed: true,
      },
      "test-targeted-domain-0001",
    );
    // Simulate the pre-global JSON contract already present in stored jobs.
    await database
      .update(schema.jobs)
      .set({
        input: {
          ...job.input,
          scope: undefined,
          country: "US",
          region: "NY",
          city: "New York",
          niche: "*",
          sources: ["imports"],
        },
      })
      .where(eq(schema.jobs.id, job.id));
    const found = await discover(job.id);
    expect(found.ids).toHaveLength(1);
    const [item] = await database
      .select()
      .from(schema.jobItems)
      .where(eq(schema.jobItems.jobId, job.id));
    expect(item.result!.domainMatch!.tier).toBe("PREFIX_SUFFIX");
  });
  it("runs a separate worldwide discovery contract with explicitly simulated provider hints", async () => {
    await importRow("Novalith Fixture", {
      country: "DE",
      region: "BE",
      city: "Berlin",
      websites: "https://novalithfixture.example",
      emails: "hello@novalithfixture.example",
    });
    await importRow("Novalith Fixture Group", {
      country: "AU",
      region: "NSW",
      city: "Sydney",
      websites: "https://novalithfixturegroup.example",
      emails: "hello@novalithfixturegroup.example",
    });
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "fixture-only-key");
    vi.stubEnv("BRAVE_DISCOVERY_APPROVED", "true");
    // All fetch calls are stubbed by this suite; no provider traffic or live prospects.
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ web: { results: [] } }),
    );
    const job = await createJob(
      ownerId,
      {
        product: "domains",
        domain: "novalithfixture.com",
        ownershipAffirmed: true,
        queryBudget: 1,
      },
      "test-global-domain-0001",
    );
    expect(job.input).toMatchObject({ scope: "global", domainKind: "auto" });
    expect(job.input).not.toHaveProperty("country");
    expect(job.input).not.toHaveProperty("niche");
    const found = await discover(job.id);
    expect(found.ids).toHaveLength(2);
    const items = await database
      .select()
      .from(schema.jobItems)
      .where(eq(schema.jobItems.jobId, job.id));
    expect(items.map((i) => i.result!.country).sort()).toEqual(["AU", "DE"]);
    const other = await signup("global-tenant@test.example");
    expect(
      (await request(`jobs/${job.id}`, "GET", undefined, other.cookie)).status,
    ).toBe(404);
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "");
    vi.stubEnv("BRAVE_DISCOVERY_APPROVED", "false");
    const unavailable = await createJob(
      ownerId,
      {
        product: "domains",
        domain: "novalithfixture.com",
        ownershipAffirmed: true,
      },
      "test-global-unavailable-001",
    );
    await expect(discover(unavailable.id)).rejects.toThrow("unavailable");
    expect(
      (
        await database
          .select()
          .from(schema.jobItems)
          .where(eq(schema.jobItems.jobId, unavailable.id))
      ).length,
    ).toBe(0);
  });
  it("discovers independently permitted first-party businesses without retaining search snippets", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "fixture-only-key");
    vi.stubEnv("BRAVE_DISCOVERY_APPROVED", "true");
    const host = "quillora-fixture.example";
    const [permission] = await database
      .select()
      .from(schema.sourceConfigs)
      .where(
        and(
          eq(schema.sourceConfigs.ownerId, ownerId),
          eq(schema.sourceConfigs.source, "website"),
        ),
      );
    await database
      .update(schema.sourceConfigs)
      .set({
        enabled: true,
        policy: {
          ...permission.policy,
          approvedHosts: [...permission.policy.approvedHosts, host],
        },
      })
      .where(
        and(
          eq(schema.sourceConfigs.ownerId, ownerId),
          eq(schema.sourceConfigs.source, "website"),
        ),
      );
    const body = `<html><head><title>Quillora Fixture</title><script type="application/ld+json">{"@type":"Organization","name":"Quillora Fixture","url":"https://${host}"}</script></head><body><h1>Quillora Fixture</h1><p>A fictional professional business used only by deterministic automated tests. This sufficiently detailed business page describes services and appointment availability. No real company, email recipient or provider is contacted during this test.</p><a href="/services">Services</a><a href="mailto:hello@${host}">Office</a><time datetime="${new Date().toISOString()}">Fixture date</time></body></html>`;
    vi.mocked(safeFetch).mockImplementation(async (url) => ({
      status: 200,
      url,
      body: url.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : body,
      contentType: url.endsWith("robots.txt") ? "text/plain" : "text/html",
    }));
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        web: {
          results: [
            {
              url: `https://${host}`,
              title: "UNTRUSTED SERP NAME",
              description: "UNTRUSTED PROVIDER CONTACT",
            },
          ],
        },
      }),
    );
    const job = await createJob(
      ownerId,
      {
        product: "domains",
        domain: "quillorafixture.com",
        ownershipAffirmed: true,
        queryBudget: 1,
      },
      "test-global-firstparty-001",
    );
    const found = await discover(job.id);
    expect(found.ids).toHaveLength(1);
    const [record] = await database
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, found.ids[0]));
    expect(record.record.name).toBe("Quillora Fixture");
    expect(record.record.country).toBe("");
    expect(record.record.website?.identity).toBe(true);
    expect(record.record.contacts[0].email).toBe(`hello@${host}`);
    expect(JSON.stringify(record.record)).not.toContain("UNTRUSTED");
    expect(record.record.quality?.status).not.toBe("QUALIFIED"); // first-party alone is insufficient
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ web: { results: [{ url: `https://${host}` }] } }),
    );
    const duplicate = await createJob(
      ownerId,
      {
        product: "domains",
        domain: "quillorafixture.com",
        ownershipAffirmed: true,
        queryBudget: 1,
      },
      "test-global-firstparty-002",
    );
    expect((await discover(duplicate.id)).ids).toEqual(found.ids);
    const assessResult = await processBusiness(job.id, record.id);
    expect(assessResult.status).not.toBe("QUALIFIED");
    vi.mocked(safeFetch).mockImplementation(async (url) => ({
      status: 200,
      url,
      body: url.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : page,
      contentType: url.endsWith("robots.txt") ? "text/plain" : "text/html",
    }));
    await database
      .update(schema.sourceConfigs)
      .set({ policy: permission.policy })
      .where(
        and(
          eq(schema.sourceConfigs.ownerId, ownerId),
          eq(schema.sourceConfigs.source, "website"),
        ),
      );
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "");
    vi.stubEnv("BRAVE_DISCOVERY_APPROVED", "false");
  });
  it("polls global discovery under one renewable lease and fences a superseded writer", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "fixture-only-key");
    vi.stubEnv("BRAVE_DISCOVERY_APPROVED", "true");
    let release!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    vi.mocked(fetch).mockImplementationOnce(() => pending);
    const job = await createJob(
      ownerId,
      {
        product: "domains",
        domain: "unmatchedfixture.com",
        ownershipAffirmed: true,
        queryBudget: 1,
      },
      "test-global-lease-0001",
    );
    expect(await requestDiscovery(job.id)).toEqual({ status: "IN_PROGRESS" });
    expect(await requestDiscovery(job.id)).toEqual({ status: "IN_PROGRESS" });
    release(Response.json({ web: { results: [] } }));
    await vi.waitFor(async () => {
      expect((await requestDiscovery(job.id)).status).toBe("DONE");
    });
    const [done] = await database
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, job.id));
    expect(done.discovered).toBe(0);
    const superseded = await createJob(
      ownerId,
      {
        product: "domains",
        domain: "unmatchedfixture.com",
        ownershipAffirmed: true,
        queryBudget: 1,
      },
      "test-global-lease-0002",
    );
    await database
      .update(schema.jobs)
      .set({ discoveryLeaseToken: "new-worker-token" })
      .where(eq(schema.jobs.id, superseded.id));
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ web: { results: [] } }),
    );
    await expect(discover(superseded.id, "old-worker-token")).rejects.toThrow(
      "superseded",
    );
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "");
    vi.stubEnv("BRAVE_DISCOVERY_APPROVED", "false");
  });
  it("rejects cross-tenant reads/writes, source changes by nonadmins and cross-origin mutations", async () => {
    const other = await signup("other@test.example");
    const [job] = await database
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.ownerId, ownerId));
    expect(
      (await request(`jobs/${job.id}`, "GET", undefined, other.cookie)).status,
    ).toBe(404);
    expect((await request("imports", "POST", {}, other.cookie)).status).toBe(
      403,
    );
    expect(
      (await request("sources", "GET", undefined, other.cookie)).status,
    ).toBe(403);
    expect(
      (await request("admin/status", "GET", undefined, other.cookie)).status,
    ).toBe(403);
    expect(
      (await request("admin/testimonials", "GET", undefined, other.cookie))
        .status,
    ).toBe(403);
    expect(
      (await request("admin/testimonials", "POST", {}, other.cookie)).status,
    ).toBe(403);
    expect((await request("admin/testimonials")).status).toBe(200);
    expect((await request("admin/status")).status).toBe(200);
    const malicious = new Request(base + "/api/jobs", {
      method: "POST",
      headers: { Cookie: cookie, Origin: "https://attacker.example" },
      body: "{}",
    });
    expect((await handleApi(malicious, ["jobs"])).status).toBe(403);
  });
  it("lets only administrators provision records and host policies for a customer workspace", async () => {
    const target = await signup("provisioned@test.example");
    const data = {
      targetEmail: "provisioned@test.example",
      source: "imports",
      sourceUrl: "https://directory.example/provisioning",
      license: "TEST-only licensed data",
      attribution: "TEST FIXTURE ONLY",
      permissionConfirmed: true,
      format: "jsonl",
      content: JSON.stringify({
        source_id: "provisioned-fixture",
        name: "Provisioned Plumbing",
        country: "US",
        region: "NY",
        city: "New York",
        niche: "plumber",
        fixture: true,
      }),
    };
    expect((await request("imports", "POST", data, target.cookie)).status).toBe(
      403,
    );
    expect((await request("imports", "POST", data)).status).toBe(201);
    const [record] = await database
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.name, "Provisioned Plumbing"));
    expect(record.ownerId).toBe(target.id);
    expect((await request(`leads/${record.id}/save`, "POST", {})).status).toBe(
      404,
    );
    const policy = {
      targetEmail: "provisioned@test.example",
      enabled: true,
      approvedHosts: ["provisioned.example"],
      license: "TEST fixture approval",
      attribution: "TEST fixture attribution",
      permissionConfirmed: true,
    };
    expect((await request("sources/website", "POST", policy)).status).toBe(200);
    const [config] = await database
      .select()
      .from(schema.sourceConfigs)
      .where(eq(schema.sourceConfigs.ownerId, target.id));
    expect(config.policy.approvedHosts).toEqual(["provisioned.example"]);
    expect(
      (
        await request("imports", "POST", {
          ...data,
          targetEmail: "missing@test.example",
        })
      ).status,
    ).toBe(404);
  });
  it("keeps provider setup out of public status without claiming live availability", async () => {
    const response = await request("status");
    const status = await response.json();
    expect(status).toMatchObject({ auth: true, recovery: true });
    expect(status).not.toHaveProperty("sources");
    expect(status).not.toHaveProperty("database");
    expect(status).not.toHaveProperty("verifier");
  });
  it("persists source choices independently per finder and rejects unapproved providers", async () => {
    await importRow("Source preference catalog fixture");
    const initial = await request("source-preferences?product=contacts");
    const initialData = await initial.json();
    expect(initialData.supported).toEqual(["imports"]);
    expect(initialData.selected).toEqual(["imports"]);
    expect(initialData.catalog).toHaveLength(8);
    expect(
      initialData.catalog.find(
        (source: { id: string }) => source.id === "overture",
      ).state,
    ).toBe("NOT_CONFIGURED");
    expect(
      (
        await request("source-preferences?product=contacts", "PUT", {
          product: "contacts",
          sources: ["imports"],
        })
      ).status,
    ).toBe(200);
    expect(
      await (await request("source-preferences?product=opportunities")).json(),
    ).toMatchObject({ selected: ["imports"] });
    expect(
      await (await request("source-preferences?product=contacts")).json(),
    ).toMatchObject({ selected: ["imports"] });
    expect(
      (
        await request("source-preferences?product=contacts", "PUT", {
          product: "contacts",
          sources: [],
        })
      ).status,
    ).toBe(200);
    expect(
      await (await request("source-preferences?product=contacts")).json(),
    ).toMatchObject({ selected: [] });
    expect(
      (
        await request("source-preferences?product=contacts", "PUT", {
          product: "contacts",
          sources: ["google"],
        })
      ).status,
    ).toBe(400);
    const emptyAccount = await signup("empty-source-catalog@test.example");
    const emptyCatalog = await (
      await request(
        "source-preferences?product=contacts",
        "GET",
        undefined,
        emptyAccount.cookie,
      )
    ).json();
    expect(emptyCatalog.supported).toEqual([]);
    expect(emptyCatalog.selected).toEqual([]);
    expect(emptyCatalog.catalog).toHaveLength(8);
  });
  it("uses expiring single-use reset tokens, rejects weak passwords, and revokes existing sessions", async () => {
    const target = await signup("recovery@test.example");
    async function authRequest(path: string, body: unknown) {
      return getAuth().handler(
        new Request(`${base}/api/auth/${path}`, {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    }
    const reset = await authRequest("request-password-reset", {
      email: "recovery@test.example",
      redirectTo: `${base}/reset-password`,
    });
    const unknown = await authRequest("request-password-reset", {
      email: "unknown@test.example",
      redirectTo: `${base}/reset-password`,
    });
    expect(reset.status).toBe(200);
    expect(await unknown.json()).toEqual(await reset.json());
    const calls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([url]) => String(url) === "https://api.resend.com/emails",
      );
    expect(calls.length).toBeGreaterThan(0);
    const sent = JSON.parse(calls.at(-1)![1]!.body as string);
    expect(sent.to).toEqual(["recovery@test.example"]);
    const url = new URL(sent.text.match(/http[^\s]+/)[0]);
    expect(url.origin).toBe(base);
    const token = url.searchParams.get("token")!;
    const [stored] = await database
      .select()
      .from(schema.verification)
      .where(eq(schema.verification.identifier, `reset-password:${token}`));
    expect(stored.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
      15 * 60000,
    );
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(14 * 60000);
    expect(
      (await authRequest("reset-password", { token, newPassword: "too-short" }))
        .status,
    ).toBe(400);
    const newPassword = "New-Unique-Passphrase-2026";
    const concurrent = await Promise.all([
      authRequest("reset-password", { token, newPassword }),
      authRequest("reset-password", { token, newPassword }),
    ]);
    expect(concurrent.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(
      (await authRequest("reset-password", { token, newPassword })).status,
    ).toBe(400);
    expect(
      await getAuth().api.getSession({
        headers: new Headers({ Cookie: target.cookie }),
      }),
    ).toBeNull();
    expect(
      (
        await authRequest("sign-in/email", {
          email: "recovery@test.example",
          password: newPassword,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await authRequest("sign-in/email", {
          email: "recovery@test.example",
          password: "Strong-Test-Password-2026",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await authRequest("request-password-reset", {
          email: "recovery@test.example",
          redirectTo: "https://attacker.example/reset",
        })
      ).status,
    ).toBe(403);
    await database.insert(schema.verification).values({
      id: "fixture-expired-reset",
      identifier: "reset-password:expired-fixture-token",
      value: target.id,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(
      (
        await authRequest("reset-password", {
          token: "expired-fixture-token",
          newPassword,
        })
      ).status,
    ).toBe(400);
  });
  it("returns recovery responses without waiting for a slow email provider", async () => {
    await signup("slow-delivery@test.example");
    let release!: (response: Response) => void;
    const delivery = new Promise<Response>((resolve) => {
      release = resolve;
    });
    vi.mocked(fetch).mockReturnValueOnce(delivery);
    const priorTasks = authTasks.pending.length;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        getAuth().handler(
          new Request(`${base}/api/auth/request-password-reset`, {
            method: "POST",
            headers: {
              Origin: base,
              "Content-Type": "application/json",
              "X-Forwarded-For": "198.51.100.41",
            },
            body: JSON.stringify({
              email: "slow-delivery@test.example",
              redirectTo: "/reset-password",
            }),
          }),
        ),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error("Recovery response waited for provider delivery"),
              ),
            3000,
          );
        }),
      ]);
      expect(response.status).toBe(200);
      expect(authTasks.pending.length).toBeGreaterThan(priorTasks);
    } finally {
      clearTimeout(timer);
      release(Response.json({ id: "fixture-slow-delivery-accepted" }));
    }
  });
  it("does not reveal a registered account when the transactional provider fails", async () => {
    await signup("delivery-failure@test.example");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ error: "fixture provider outage" }, { status: 503 }),
    );
    const send = (email: string) =>
      getAuth().handler(
        new Request(`${base}/api/auth/request-password-reset`, {
          method: "POST",
          headers: {
            Origin: base,
            "Content-Type": "application/json",
            "X-Forwarded-For": "198.51.100.40",
          },
          body: JSON.stringify({ email, redirectTo: "/reset-password" }),
        }),
      );
    const known = await send("delivery-failure@test.example");
    const unknown = await send("not-an-account@test.example");
    expect(known.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("delivery failed"),
    );
    expect(log.mock.calls.flat().join(" ")).not.toMatch(
      /delivery-failure@|token=|fixture-email-key/,
    );
    await send("not-an-account@test.example");
    expect((await send("not-an-account@test.example")).status).toBe(429);
    log.mockRestore();
  });
  it("reserves budgets atomically and rejects exhausted provider queries", async () => {
    vi.stubEnv("DAILY_SEARCH_BUDGET", "1");
    await expect(
      createJob(
        ownerId,
        {
          product: "contacts",
          country: "US",
          region: "NY",
          city: "New York",
          niche: "plumber",
          sources: ["imports"],
          limit: 2,
          queryBudget: 0,
        },
        "test-over-budget-0001",
      ),
    ).rejects.toThrow("budget");
    vi.stubEnv("DAILY_SEARCH_BUDGET", "500");
    const job = await createJob(
      ownerId,
      {
        product: "contacts",
        country: "US",
        region: "NY",
        city: "New York",
        niche: "plumber",
        sources: ["imports"],
        limit: 1,
        queryBudget: 0,
      },
      "test-zero-provider-0001",
    );
    await expect(consumeProvider(ownerId, job.id, "hunter")).rejects.toThrow(
      "budget",
    );
  });
  it("persisted cancellation prevents worker processing", async () => {
    const job = await createJob(
      ownerId,
      {
        product: "contacts",
        country: "US",
        region: "NY",
        city: "New York",
        niche: "plumber",
        sources: ["imports"],
        limit: 1,
        queryBudget: 0,
      },
      "test-cancellation-0001",
    );
    await discover(job.id);
    await request(`jobs/${job.id}/cancel`, "POST", {});
    const [item] = await database
      .select()
      .from(schema.jobItems)
      .where(eq(schema.jobItems.jobId, job.id));
    expect((await processBusiness(job.id, item.businessId)).status).toBe(
      "CANCELLED",
    );
  });
  it("a superseded worker cannot overwrite another worker's lease or mark it failed", async () => {
    const [row] = await database
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.name, "Alpha Plumbing"));
    const job = await createJob(
      ownerId,
      {
        product: "contacts",
        country: "US",
        region: "NY",
        city: "New York",
        niche: "plumber",
        sources: ["imports"],
        limit: 1,
        queryBudget: 5,
      },
      "test-stale-lease-token-001",
    );
    await database
      .insert(schema.jobItems)
      .values({ jobId: job.id, businessId: row.id });
    vi.mocked(safeFetch).mockImplementationOnce(async (url) => {
      await database
        .update(schema.jobItems)
        .set({
          leaseToken: "replacement-worker",
          leaseUntil: new Date(Date.now() + 300000),
        })
        .where(eq(schema.jobItems.jobId, job.id));
      return {
        status: 200,
        url,
        body: "User-agent: *\nAllow: /",
        contentType: "text/plain",
      };
    });
    await expect(processBusiness(job.id, row.id)).rejects.toThrow("superseded");
    const [item] = await database
      .select()
      .from(schema.jobItems)
      .where(eq(schema.jobItems.jobId, job.id));
    expect(item.leaseToken).toBe("replacement-worker");
    expect(item.state).toBe("PROCESSING");
    const [unchanged] = await database
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, job.id));
    expect(unchanged.processed).toBe(0);
  });
});
