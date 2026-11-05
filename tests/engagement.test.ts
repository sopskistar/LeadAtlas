import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
let db: ReturnType<typeof drizzle<typeof schema>>;
const client = new PGlite();
vi.mock("../src/lib/db", () => ({ getDb: () => db }));
import {
  handleUpdates,
  updatesConfigured,
  unsubscribeToken,
  resendUpdatesMailer,
  type UpdatesMailer,
} from "../src/lib/server/updates";
import {
  publishedTestimonials,
  saveTestimonial,
} from "../src/lib/server/testimonials";
const base = "http://localhost:3450";
const send = vi
  .fn<UpdatesMailer["sendConfirmation"]>()
  .mockResolvedValue(undefined);
async function request(action: string, data: unknown, origin = base) {
  return handleUpdates(
    new Request(`${base}/api/updates${action}`, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    ["updates", ...action.split("/").filter(Boolean)],
    { sendConfirmation: send },
  );
}
beforeAll(async () => {
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await client.exec(await readFile(`drizzle/${file}`, "utf8"));
  db = drizzle(client, { schema });
  vi.stubEnv("DATABASE_URL", "postgres://fixture-only/no-network");
  vi.stubEnv("APP_BASE_URL", base);
  vi.stubEnv(
    "UPDATES_TOKEN_SECRET",
    "test-newsletter-secret-12345678901234567890",
  );
  vi.stubEnv("UPDATES_EMAIL_FROM", "LeadAtlas <updates@test.example>");
  vi.stubEnv("UPDATES_SENDER_VERIFIED", "true");
  vi.stubEnv("RESEND_API_KEY", "test-no-live-provider");
}, 30000);
afterAll(async () => {
  await client.close();
  vi.unstubAllEnvs();
});
describe("real subscription persistence and consent", () => {
  it("returns honest unavailable, validation and origin states", async () => {
    vi.stubEnv("UPDATES_SENDER_VERIFIED", "false");
    expect(updatesConfigured()).toBe(false);
    expect(
      (await request("", { email: "test@example.com", consent: true })).status,
    ).toBe(503);
    vi.stubEnv("UPDATES_SENDER_VERIFIED", "true");
    expect(
      (await request("", { email: "not-email", consent: true })).status,
    ).toBe(400);
    expect(
      (await request("", { email: "test@example.com", consent: false })).status,
    ).toBe(400);
    expect(
      (
        await request(
          "",
          { email: "test@example.com", consent: true },
          "https://bad.example",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request("", {
          email: "test@example.com",
          consent: true,
          website: "bot input",
        })
      ).status,
    ).toBe(400);
  });
  it("persists pending consent, sends only confirmation, and deduplicates requests", async () => {
    expect(
      (await request("", { email: "Customer@Example.com", consent: true }))
        .status,
    ).toBe(202);
    const [row] = await db
      .select()
      .from(schema.updateSubscriptions)
      .where(eq(schema.updateSubscriptions.email, "customer@example.com"));
    expect(row.status).toBe("PENDING");
    expect(row.confirmedAt).toBeNull();
    expect(row.confirmationSentAt).not.toBeNull();
    const message = send.mock.calls.at(-1)![0];
    expect(message.confirmUrl).toContain(`${base}/updates/confirm?token=`);
    expect(row.confirmTokenHash).not.toContain(
      new URL(message.confirmUrl).searchParams.get("token")!,
    );
    const calls = send.mock.calls.length;
    await Promise.all([
      request("", { email: "customer@example.com", consent: true }),
      request("", { email: "customer@example.com", consent: true }),
    ]);
    expect(send.mock.calls.length).toBe(calls);
    expect(
      (await request("", { email: "customer@example.com", consent: true }))
        .status,
    ).toBe(429);
  });
  it("requires a valid single-use confirmation and supports durable unsubscribe", async () => {
    await request("", { email: "confirmed@example.com", consent: true });
    const message = send.mock.calls.at(-1)![0];
    const token = new URL(message.confirmUrl).searchParams.get("token");
    expect((await request("/confirm", { token })).status).toBe(200);
    expect((await request("/confirm", { token })).status).toBe(400);
    const [row] = await db
      .select()
      .from(schema.updateSubscriptions)
      .where(eq(schema.updateSubscriptions.email, "confirmed@example.com"));
    expect(row.status).toBe("ACTIVE");
    const unsub = unsubscribeToken(row.id);
    expect((await request("/unsubscribe", { token: unsub })).status).toBe(200);
    expect((await request("/unsubscribe", { token: unsub })).status).toBe(200);
    expect(
      (await request("/unsubscribe", { token: unsub.slice(0, -1) + "x" }))
        .status,
    ).toBe(400);
    const [suppressed] = await db
      .select()
      .from(schema.updateSubscriptions)
      .where(eq(schema.updateSubscriptions.id, row.id));
    expect(suppressed.status).toBe("UNSUBSCRIBED");
    // Explicit reconsent cannot be confirmed by a stale token; old unsubscribe links remain valid.
    await db
      .update(schema.updateSubscriptions)
      .set({ requestedAt: new Date(0) })
      .where(eq(schema.updateSubscriptions.id, row.id));
    await request("", { email: row.email, consent: true });
    expect((await request("/confirm", { token })).status).toBe(400);
    expect((await request("/unsubscribe", { token: unsub })).status).toBe(200);
  });
  it("does not activate expired links or report provider/persistence failures as success", async () => {
    await request("", { email: "expired@example.com", consent: true });
    const token = new URL(
      send.mock.calls.at(-1)![0].confirmUrl,
    ).searchParams.get("token");
    await db
      .update(schema.updateSubscriptions)
      .set({ confirmExpiresAt: new Date(0) })
      .where(eq(schema.updateSubscriptions.email, "expired@example.com"));
    expect((await request("/confirm", { token })).status).toBe(400);
    send.mockRejectedValueOnce(new Error("Simulated provider failure"));
    expect(
      (await request("", { email: "failure@example.com", consent: true }))
        .status,
    ).toBe(503);
    const [pending] = await db
      .select()
      .from(schema.updateSubscriptions)
      .where(eq(schema.updateSubscriptions.email, "failure@example.com"));
    expect(pending.status).toBe("PENDING");
    expect(pending.confirmationSentAt).toBeNull();
    const original = db;
    db = {
      transaction: async () => {
        throw new Error("Simulated database failure");
      },
    } as unknown as typeof db;
    expect(
      (await request("", { email: "db-failure@example.com", consent: true }))
        .status,
    ).toBe(503);
    db = original;
  });
  it("honors one-click unsubscribe without changing state on GET", async () => {
    const [row] = await db
      .select()
      .from(schema.updateSubscriptions)
      .where(eq(schema.updateSubscriptions.email, "failure@example.com"));
    const token = unsubscribeToken(row.id);
    expect(
      (
        await handleUpdates(
          new Request(`${base}/api/updates/unsubscribe?token=${token}`),
          ["updates", "unsubscribe"],
        )
      ).status,
    ).toBe(405);
    const result = await handleUpdates(
      new Request(`${base}/api/updates/unsubscribe?token=${token}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      }),
      ["updates", "unsubscribe"],
    );
    expect(result.status).toBe(200);
  });
});
describe("permissioned testimonials, no invented public reviews", () => {
  const review = {
    displayName: "TEST reviewer",
    roleOrBusiness: "TEST company",
    text: "TEST FIXTURE ONLY. This is not a real customer testimonial.",
  };
  it("is empty until reviews have independent permission and admin approval", async () => {
    expect(await publishedTestimonials()).toEqual([]);
    await saveTestimonial(review, "test-admin");
    expect(await publishedTestimonials()).toEqual([]);
    await expect(
      saveTestimonial(
        {
          ...review,
          approvalStatus: "APPROVED",
          publishedAt: new Date().toISOString(),
        },
        "test-admin",
      ),
    ).rejects.toThrow();
    await expect(
      saveTestimonial(
        { ...review, photoPath: "https://unapproved.example/photo.jpg" },
        "test-admin",
      ),
    ).rejects.toThrow();
    await expect(
      saveTestimonial(
        {
          ...review,
          photoPath: "/testimonials/fixture.webp",
          photoPermission: false,
        },
        "test-admin",
      ),
    ).rejects.toThrow();
  });
  it("shows at most five approved past-dated reviews and never exposes private evidence", async () => {
    for (let i = 0; i < 7; i++)
      await saveTestimonial(
        {
          ...review,
          displayName: `TEST ${i}`,
          permissionStatus: "GRANTED",
          permissionEvidence: "TEST consent record only",
          approvalStatus: "APPROVED",
          publishedAt: new Date(Date.now() - 10000).toISOString(),
        },
        "test-admin",
      );
    await saveTestimonial(
      {
        ...review,
        displayName: "TEST future",
        permissionStatus: "GRANTED",
        permissionEvidence: "TEST future permission",
        approvalStatus: "APPROVED",
        publishedAt: new Date(Date.now() + 86400000).toISOString(),
      },
      "test-admin",
    );
    const published = await publishedTestimonials();
    expect(published).toHaveLength(5);
    expect(published.every((r) => r.displayName !== "TEST future")).toBe(true);
    expect(published[0]).not.toHaveProperty("permissionEvidence");
    const id = published[0].id;
    await saveTestimonial(
      {
        ...review,
        id,
        permissionStatus: "REVOKED",
        permissionEvidence: "TEST revoked permission",
        approvalStatus: "DRAFT",
      },
      "test-admin",
    );
    expect((await publishedTestimonials()).some((r) => r.id === id)).toBe(
      false,
    );
  });
});

describe("transactional confirmation mail adapter", () => {
  const message = {
    to: "fixture@example.com",
    confirmUrl: `${base}/updates/confirm?token=fixture`,
    unsubscribeUrl: `${base}/updates/unsubscribe?token=fixture`,
    oneClickUrl: `${base}/api/updates/unsubscribe?token=fixture`,
    requestId: "fixture-request",
  };
  it("requires provider acceptance and includes explicit confirmation and unsubscribe headers", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ id: "fixture-provider-message" }));
    try {
      await resendUpdatesMailer.sendConfirmation(message);
      const [url, options] = fetcher.mock.calls[0];
      expect(url).toBe("https://api.resend.com/emails");
      expect(options?.headers).toMatchObject({
        "Idempotency-Key": "updates-confirm/fixture-request",
      });
      const body = JSON.parse(String(options?.body));
      expect(body.to).toEqual([message.to]);
      expect(body.text).toContain("You are not subscribed until you confirm.");
      expect(body.headers).toEqual({
        "List-Unsubscribe": `<${message.oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
    } finally {
      fetcher.mockRestore();
    }
  });
  it("rejects provider failures, invalid acceptance and foreign confirmation origins", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    try {
      fetcher.mockResolvedValueOnce(
        Response.json({ error: "fixture" }, { status: 503 }),
      );
      await expect(
        resendUpdatesMailer.sendConfirmation(message),
      ).rejects.toThrow();
      fetcher.mockResolvedValueOnce(Response.json({ accepted: true }));
      await expect(
        resendUpdatesMailer.sendConfirmation(message),
      ).rejects.toThrow();
      await expect(
        resendUpdatesMailer.sendConfirmation({
          ...message,
          confirmUrl: "https://foreign.example/confirm",
        }),
      ).rejects.toThrow("Invalid updates mail origin");
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      fetcher.mockRestore();
    }
  });
});
