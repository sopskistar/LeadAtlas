import { createHmac, timingSafeEqual } from "node:crypto";
export function signWorker(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}
export function validWorkerSignature(
  body: string,
  timestamp: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  if (
    secret.length < 32 ||
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 60000 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(signWorker(body, timestamp, secret), "hex"),
    Buffer.from(signature, "hex"),
  );
}
export async function workerCall(payload: {
  action: "discover" | "process" | "finish";
  jobId: string;
  businessId?: string;
}) {
  const endpoint = new URL("/work", process.env.WORKER_URL!);
  if (process.env.NODE_ENV === "production" && endpoint.protocol !== "https:")
    throw new Error("Worker requires HTTPS in production");
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const response = await fetch(endpoint, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "X-LeadAtlas-Timestamp": timestamp,
      "X-LeadAtlas-Signature": signWorker(
        body,
        timestamp,
        process.env.WORKER_SECRET!,
      ),
    },
    signal: AbortSignal.timeout(55000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Worker HTTP ${response.status}; retry is safe`);
  return (await response.json()) as { ids?: string[]; status?: string };
}
