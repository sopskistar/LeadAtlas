import { resolveMx } from "node:dns/promises";
import type { Contact, EmailStatus, Verification } from "../core/types";
import { deadline } from "../core/deadline";
export function hunterStatus(status: string, result?: string): EmailStatus {
  if (status === "valid" && (!result || result === "deliverable"))
    return "LIKELY_DELIVERABLE";
  if (["accept_all", "catch_all"].includes(status)) return "CATCH_ALL";
  if (status === "disposable") return "DISPOSABLE";
  if (status === "webmail" || status === "unknown" || status === "risky")
    return "UNKNOWN";
  if (status === "invalid") return "INVALID";
  if (status === "do_not_mail") return "DO_NOT_MAIL";
  return "UNKNOWN";
}
export async function verifyEmail(
  contact: Contact,
  consume: (provider: string) => Promise<void>,
  deps = { resolveMx, fetch },
): Promise<Verification> {
  const checkedAt = new Date().toISOString();
  const base = {
    checkedAt,
    provider: "local",
    nativeStatus: "not_verified",
    detail: "Syntax and MX are prefilters only",
  };
  if (
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(
      contact.email,
    )
  )
    return {
      ...base,
      status: "INVALID",
      mx: "UNKNOWN",
      detail: "Invalid email syntax",
    };
  let mx: "PRESENT" | "ABSENT" | "UNKNOWN" = "UNKNOWN";
  try {
    const records = await deadline(
      deps.resolveMx(contact.email.split("@")[1]),
      6000,
    );
    mx = records.some((r) => r.exchange && r.exchange !== ".")
      ? "PRESENT"
      : "ABSENT";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (["ENODATA", "ENOTFOUND"].includes(code ?? "")) mx = "ABSENT";
  }
  if (mx === "ABSENT")
    return {
      ...base,
      status: "INVALID",
      mx,
      detail: "No MX record (or null MX)",
    };
  if (mx !== "PRESENT")
    return {
      ...base,
      status: "UNVERIFIED",
      mx,
      detail: "DNS lookup uncertain; verification deferred",
    };
  if (!process.env.HUNTER_API_KEY)
    return {
      ...base,
      status: "UNVERIFIED",
      mx,
      detail: "Hunter credentials absent; no mailbox verification performed",
    };
  try {
    await consume("hunter");
    const url = new URL("https://api.hunter.io/v2/email-verifier");
    url.searchParams.set("email", contact.email);
    url.searchParams.set("api_key", process.env.HUNTER_API_KEY);
    const response = await deps.fetch(url, {
      signal: AbortSignal.timeout(23000),
      cache: "no-store",
    });
    if (response.status === 451)
      return {
        ...base,
        status: "DO_NOT_MAIL",
        mx,
        provider: "hunter",
        nativeStatus: "claimed_email",
        detail: "Mailbox owner requested no processing; do not contact",
      };
    if (response.status === 202)
      return {
        ...base,
        status: "UNVERIFIED",
        mx,
        provider: "hunter",
        nativeStatus: "pending",
        detail:
          "Verification still running; schedule revalidation, never infer valid",
      };
    if (!response.ok)
      return {
        ...base,
        status: "UNVERIFIED",
        mx,
        provider: "hunter",
        nativeStatus: `http_${response.status}`,
        detail: "Verifier unavailable; retry within budget",
      };
    const raw = (await response.json()) as {
      data?: {
        email?: string;
        status?: string;
        result?: string;
        disposable?: boolean;
        accept_all?: boolean;
        block?: boolean;
        date?: string;
        verification?: { date?: string };
      };
    };
    const data = raw.data;
    if (!data?.status)
      return {
        ...base,
        status: "UNVERIFIED",
        mx,
        provider: "hunter",
        detail: "Malformed provider response",
      };
    if (data.email && data.email.toLowerCase() !== contact.email.toLowerCase())
      return {
        ...base,
        status: "UNKNOWN",
        mx,
        provider: "hunter",
        nativeStatus: "identity_mismatch",
        detail: "Provider response does not match the requested mailbox",
      };
    const providerDate = data.verification?.date ?? data.date;
    const actualDate =
      providerDate && Number.isFinite(Date.parse(providerDate))
        ? new Date(providerDate).toISOString()
        : checkedAt;
    const mapped = data.block
      ? "UNKNOWN"
      : data.disposable
        ? "DISPOSABLE"
        : data.accept_all
          ? "CATCH_ALL"
          : hunterStatus(data.status, data.result);
    const status =
      mapped === "LIKELY_DELIVERABLE" && !providerDate ? "UNVERIFIED" : mapped;
    return {
      checkedAt: actualDate,
      mx,
      status,
      nativeStatus: `${data.status}/${data.result ?? "unspecified"}`,
      provider: "hunter",
      detail:
        "Provider assessment; inbox delivery, employment and readership are not guaranteed",
    };
  } catch {
    return {
      ...base,
      status: "UNVERIFIED",
      mx,
      provider: "hunter",
      detail: "Verification failed or quota reached; no valid claim made",
    };
  }
}
