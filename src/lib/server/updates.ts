import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  quotaCounters,
  updateSubscriptions,
  updateSubscriptionEvents,
} from "../db/schema";
import { UPDATES_CONSENT_VERSION } from "../core/engagement";
class UpdatesError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function origin() {
  const url = new URL(process.env.APP_BASE_URL ?? "");
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && url.protocol === "http:"))
  )
    throw new Error("Invalid updates origin");
  return url.origin;
}
function persistenceConfigured() {
  return (
    !!process.env.DATABASE_URL &&
    (process.env.UPDATES_TOKEN_SECRET?.length ?? 0) >= 32
  );
}
export function updatesConfigured() {
  try {
    return (
      persistenceConfigured() &&
      !!origin() &&
      !!process.env.RESEND_API_KEY &&
      !!process.env.UPDATES_EMAIL_FROM &&
      process.env.UPDATES_SENDER_VERIFIED === "true"
    );
  } catch {
    return false;
  }
}
function signature(id: string) {
  return createHmac("sha256", process.env.UPDATES_TOKEN_SECRET!)
    .update(`leadatlas-updates-unsubscribe:${id}`)
    .digest("hex");
}
export function unsubscribeToken(id: string) {
  return `${id}.${signature(id)}`;
}
function unsubscribeIdentity(token: string) {
  const match = /^([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
  if (
    !match ||
    !timingSafeEqual(
      Buffer.from(match[2], "hex"),
      Buffer.from(signature(match[1]), "hex"),
    )
  )
    throw new UpdatesError(400, "This unsubscribe link is invalid.");
  return match[1];
}
export interface UpdatesMailer {
  sendConfirmation(message: {
    to: string;
    confirmUrl: string;
    unsubscribeUrl: string;
    oneClickUrl: string;
    requestId: string;
  }): Promise<void>;
}
export const resendUpdatesMailer: UpdatesMailer = {
  async sendConfirmation(message) {
    const allowed = origin();
    for (const value of [
      message.confirmUrl,
      message.unsubscribeUrl,
      message.oneClickUrl,
    ])
      if (new URL(value).origin !== allowed)
        throw new Error("Invalid updates mail origin");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `updates-confirm/${message.requestId}`,
      },
      body: JSON.stringify({
        from: process.env.UPDATES_EMAIL_FROM,
        to: [message.to],
        subject: "Confirm your LeadAtlas updates",
        text: `Confirm that you want LeadAtlas product updates and launch announcements:\n\n${message.confirmUrl}\n\nThis confirmation expires in 24 hours. You are not subscribed until you confirm. If you did not request this, ignore this email.\n\nUnsubscribe or cancel this request:\n${message.unsubscribeUrl}`,
        headers: {
          "List-Unsubscribe": `<${message.oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!response.ok || typeof (await response.json()).id !== "string")
      throw new Error("Updates confirmation was not accepted");
  },
};
const signup = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
});
async function smallBody(req: Request) {
  const reader = req.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        throw new UpdatesError(413, "Request too large.");
      }
      chunks.push(value);
    }
  return Buffer.concat(chunks).toString("utf8");
}
async function rateLimit(email: string | undefined, req: Request) {
  const day = new Date().toISOString().slice(0, 13);
  // Global quota bounds cost even when a proxy header cannot be trusted.
  const ip =
    process.env.UPDATES_TRUST_PROXY === "true"
      ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown")
      : "shared";
  const scopes: [string, number][] = [
    ["updates:global", 50],
    [
      `updates:network:${digest(ip)}`,
      process.env.UPDATES_TRUST_PROXY === "true" ? 10 : 50,
    ],
  ];
  if (email) scopes.push([`updates:email:${digest(email)}`, 3]);
  await getDb().transaction(async (tx) => {
    for (const [scope, max] of scopes) {
      const rows = await tx
        .insert(quotaCounters)
        .values({ scope, day, units: 1 })
        .onConflictDoUpdate({
          target: [quotaCounters.scope, quotaCounters.day],
          set: { units: sql`${quotaCounters.units}+1` },
          setWhere: sql`${quotaCounters.units}<${max}`,
        })
        .returning();
      if (!rows.length)
        throw new UpdatesError(
          429,
          "Too many requests. Please try again later.",
        );
    }
  });
}
export async function handleUpdates(
  req: Request,
  path: string[],
  mailer: UpdatesMailer = resendUpdatesMailer,
) {
  try {
    const action = path[1];
    if (req.method === "GET" && !action)
      return json({ available: updatesConfigured() });
    if (req.method !== "POST")
      return json({ error: "Use the form to confirm this action." }, 405);
    if (!persistenceConfigured())
      throw new UpdatesError(503, "Updates signup is temporarily unavailable.");
    const raw = await smallBody(req);
    const url = new URL(req.url);
    const oneClick =
      action === "unsubscribe" &&
      req.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded") &&
      new URLSearchParams(raw).get("List-Unsubscribe") === "One-Click";
    if (!oneClick && req.headers.get("origin") !== origin())
      throw new UpdatesError(403, "Origin check failed.");
    const payload = oneClick
      ? { token: url.searchParams.get("token") }
      : JSON.parse(raw);
    if (!action) {
      if (!updatesConfigured())
        throw new UpdatesError(
          503,
          "Updates signup is temporarily unavailable.",
        );
      const input = signup.parse(payload);
      if (input.website)
        throw new UpdatesError(400, "Unable to accept this request.");
      await rateLimit(input.email, req);
      const token = randomBytes(32).toString("hex"),
        requestId = randomUUID(),
        now = new Date();
      const prepared = await getDb().transaction(async (tx) => {
        await tx
          .insert(updateSubscriptions)
          .values({
            id: randomUUID(),
            email: input.email,
            consentVersion: UPDATES_CONSENT_VERSION,
          })
          .onConflictDoNothing();
        const [row] = await tx
          .select()
          .from(updateSubscriptions)
          .where(eq(updateSubscriptions.email, input.email))
          .for("update");
        if (
          row.status === "ACTIVE" ||
          (row.confirmTokenHash &&
            now.getTime() - row.requestedAt.getTime() < 60000)
        )
          return null;
        await tx
          .update(updateSubscriptions)
          .set({
            status: "PENDING",
            consentVersion: UPDATES_CONSENT_VERSION,
            requestedAt: now,
            confirmedAt: null,
            unsubscribedAt: null,
            confirmTokenHash: digest(token),
            confirmExpiresAt: new Date(now.getTime() + 86400000),
            confirmationSentAt: null,
          })
          .where(eq(updateSubscriptions.id, row.id));
        await tx.insert(updateSubscriptionEvents).values({
          id: requestId,
          subscriptionId: row.id,
          action: "REQUESTED",
          consentVersion: UPDATES_CONSENT_VERSION,
        });
        return row.id;
      });
      if (prepared) {
        const base = origin(),
          unsub = unsubscribeToken(prepared);
        try {
          await mailer.sendConfirmation({
            to: input.email,
            confirmUrl: `${base}/updates/confirm?token=${token}`,
            unsubscribeUrl: `${base}/updates/unsubscribe?token=${unsub}`,
            oneClickUrl: `${base}/api/updates/unsubscribe?token=${unsub}`,
            requestId,
          });
          await getDb()
            .update(updateSubscriptions)
            .set({ confirmationSentAt: new Date() })
            .where(
              and(
                eq(updateSubscriptions.id, prepared),
                eq(updateSubscriptions.confirmTokenHash, digest(token)),
              ),
            );
        } catch {
          throw new UpdatesError(
            503,
            "Your request is pending, but confirmation could not be sent. Please try again later.",
          );
        }
      }
      return json(
        {
          message:
            "Request recorded. If confirmation is needed, check your inbox. Updates begin only after you confirm.",
        },
        202,
      );
    }
    if (action === "confirm") {
      const { token } = z
        .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
        .parse(payload);
      await rateLimit(undefined, req);
      await getDb().transaction(async (tx) => {
        const [row] = await tx
          .update(updateSubscriptions)
          .set({
            status: "ACTIVE",
            confirmedAt: new Date(),
            confirmTokenHash: null,
            confirmExpiresAt: null,
          })
          .where(
            and(
              eq(updateSubscriptions.confirmTokenHash, digest(token)),
              eq(updateSubscriptions.status, "PENDING"),
              gt(updateSubscriptions.confirmExpiresAt, new Date()),
            ),
          )
          .returning();
        if (!row)
          throw new UpdatesError(
            400,
            "This confirmation link is invalid or expired.",
          );
        await tx.insert(updateSubscriptionEvents).values({
          id: randomUUID(),
          subscriptionId: row.id,
          action: "CONFIRMED",
          consentVersion: row.consentVersion,
        });
      });
      return json({ message: "You’re subscribed to LeadAtlas updates." });
    }
    if (action === "unsubscribe") {
      const { token } = z.object({ token: z.string().max(150) }).parse(payload);
      const id = unsubscribeIdentity(token);
      await getDb().transaction(async (tx) => {
        const [row] = await tx
          .update(updateSubscriptions)
          .set({
            status: "UNSUBSCRIBED",
            unsubscribedAt: new Date(),
            confirmTokenHash: null,
            confirmExpiresAt: null,
          })
          .where(eq(updateSubscriptions.id, id))
          .returning();
        if (!row)
          throw new UpdatesError(400, "This unsubscribe link is invalid.");
        await tx.insert(updateSubscriptionEvents).values({
          id: randomUUID(),
          subscriptionId: id,
          action: "UNSUBSCRIBED",
          consentVersion: row.consentVersion,
        });
      });
      return json({
        message: "You’re unsubscribed. You won’t receive LeadAtlas updates.",
      });
    }
    return json({ error: "Page not found." }, 404);
  } catch (error) {
    if (error instanceof UpdatesError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json(
        {
          error:
            "Enter a valid email and give consent, or use a valid confirmation link.",
        },
        400,
      );
    return json(
      {
        error:
          "This service is temporarily unavailable. Please try again later.",
      },
      503,
    );
  }
}
