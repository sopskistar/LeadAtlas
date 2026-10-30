import "dotenv/config";
import { createServer } from "node:http";
import { z } from "zod";
import { validWorkerSignature } from "../lib/server/worker-auth";
import { discover, processBusiness, finish } from "./pipeline";
import { getDb } from "../lib/db";
import { jobItems } from "../lib/db/schema";
import { and, eq } from "drizzle-orm";
const secret = process.env.WORKER_SECRET ?? "";
if (secret.length < 32 || !process.env.DATABASE_URL)
  throw new Error(
    "Worker requires DATABASE_URL and WORKER_SECRET (32+ characters)",
  );
const input = z.object({
  action: z.enum(["discover", "process", "finish"]),
  jobId: z.uuid(),
  businessId: z.uuid().optional(),
});
createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/healthz" && req.method === "GET") {
    res.end(JSON.stringify({ status: "ok", service: "leadatlas-worker" }));
    return;
  }
  if (req.url !== "/work" || req.method !== "POST") {
    res.writeHead(404);
    res.end("{}");
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16000) throw new Error("Request too large");
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    if (
      !validWorkerSignature(
        body,
        String(req.headers["x-leadatlas-timestamp"] ?? ""),
        String(req.headers["x-leadatlas-signature"] ?? ""),
        secret,
      )
    ) {
      res.writeHead(401);
      res.end('{"error":"Unauthorized"}');
      return;
    }
    const payload = input.parse(JSON.parse(body));
    let result: { ids?: string[]; status?: string };
    if (payload.action === "discover") result = await discover(payload.jobId);
    else if (payload.action === "finish") result = await finish(payload.jobId);
    else if (payload.businessId) {
      const [item] = await getDb()
        .select()
        .from(jobItems)
        .where(
          and(
            eq(jobItems.jobId, payload.jobId),
            eq(jobItems.businessId, payload.businessId),
          ),
        );
      if (!item) {
        res.writeHead(404);
        res.end('{"error":"Work item not found"}');
        return;
      }
      if (item.state === "DONE") result = { status: "DONE" };
      else {
        if (
          item.state !== "PROCESSING" ||
          !item.leaseUntil ||
          item.leaseUntil.getTime() < Date.now()
        )
          void processBusiness(payload.jobId, payload.businessId).catch(() =>
            console.error("Work item incomplete; durable poll will retry", {
              jobId: payload.jobId,
              businessId: payload.businessId,
            }),
          );
        result = { status: "IN_PROGRESS" };
      }
    } else result = { status: "MISSING_BUSINESS_ID" };
    res.end(JSON.stringify(result));
  } catch {
    res.writeHead(503);
    res.end('{"error":"Work incomplete; retry using durable orchestration"}');
  }
}).listen(Number(process.env.PORT ?? 4000), "0.0.0.0", () =>
  console.info("LeadAtlas worker listening"),
);
