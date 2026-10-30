import type {
  ActivityStatus,
  BusinessRecord,
  Contact,
  Evidence,
  Product,
} from "./types";
import { limits, restrictedExportOrigin } from "./config";
import { parse } from "tldts";
export function fresh(
  value: string | undefined,
  days: number,
  now = new Date(),
) {
  if (!value) return false;
  const age = now.getTime() - Date.parse(value);
  return Number.isFinite(age) && age >= -60000 && age <= days * 86400000;
}
export function activityStatus(
  record: BusinessRecord,
  now = new Date(),
): ActivityStatus {
  const recent = record.evidence.filter((e) =>
    fresh(e.observedAt, limits().ACTIVITY_FRESH_DAYS, now),
  );
  const closed =
    record.operatingStatus === "permanently_closed" ||
    recent.some((e) => e.kind === "closure");
  const temporary =
    record.operatingStatus === "temporarily_closed" ||
    recent.some((e) => e.kind === "temporary_closure");
  const signals = recent.filter((e) => e.kind === "activity");
  const origins = new Set(signals.map((e) => origin(e.url)));
  const positive = origins.size >= 2 && signals.some((e) => e.independent);
  if ((closed || temporary) && positive) return "CONFLICTING";
  if (closed) return "CLOSED";
  if (temporary) return "TEMPORARILY_CLOSED";
  return positive ? "LIKELY_ACTIVE" : "UNKNOWN";
}
function origin(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return parse(hostname).domain ?? hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
export function contactQualified(c: Contact, now = new Date()) {
  return (
    c.binding === "EXACT_BUSINESS" &&
    !!c.sourceUrl &&
    c.rights.export &&
    c.rights.persist &&
    !!c.rights.license &&
    !restrictedExportOrigin(c.sourceUrl) &&
    !restrictedExportOrigin(c.rights.url) &&
    fresh(c.foundAt, limits().ACTIVITY_FRESH_DAYS, now) &&
    c.verification?.status === "LIKELY_DELIVERABLE" &&
    c.verification.mx === "PRESENT" &&
    fresh(c.verification.checkedAt, limits().EMAIL_FRESH_DAYS, now) &&
    c.verification.provider === "hunter"
  );
}
export function assess(
  record: BusinessRecord,
  product: Product,
  now = new Date(),
): NonNullable<BusinessRecord["quality"]> {
  const reasons: string[] = [];
  const activity = activityStatus(record, now);
  let rejected = false;
  let pending = false;
  if (record.fixture) {
    reasons.push("Test fixture: cannot be exported as a real lead");
    rejected = true;
  }
  if (record.suppressed) {
    reasons.push("Suppressed by user feedback");
    rejected = true;
  }
  if (
    record.operatingStatus === "permanently_closed" ||
    activity === "CLOSED" ||
    activity === "TEMPORARILY_CLOSED"
  ) {
    reasons.push("Business closed or temporarily closed");
    rejected = true;
  }
  if (activity !== "LIKELY_ACTIVE")
    reasons.push(
      `Business activity ${activity.toLowerCase()}: requires recent independent corroboration`,
    );
  for (const field of ["name", "email"]) {
    const right = record.fieldRights[field];
    if (
      !right?.export ||
      !right?.persist ||
      !right.license ||
      !right.url ||
      restrictedExportOrigin(right.url)
    )
      reasons.push(`${field} lacks permitted storage/export provenance`);
  }
  if (
    !record.website ||
    !fresh(record.website.checkedAt, limits().SITE_FRESH_DAYS, now)
  )
    reasons.push("Website evidence missing or stale");
  if (
    product === "contacts" &&
    (record.website?.status !== "OWNED_SITE_FOUND" ||
      !record.website.identity ||
      !record.website.functional)
  )
    reasons.push("No functioning, identity-matched independent website");
  if (product === "opportunities") {
    if (
      !["NO_OWNED_SITE_FOUND", "SOCIAL_ONLY"].includes(
        record.website?.status ?? "",
      )
    )
      reasons.push(
        "Website absence not established; broken sites are not website opportunities",
      );
    const checks = record.evidence.filter(
      (e) =>
        e.kind === "absence" &&
        fresh(e.observedAt, limits().SITE_FRESH_DAYS, now),
    );
    if (new Set(checks.map((e) => origin(e.url))).size < 2)
      reasons.push(
        "Website absence needs at least two documented independent checks",
      );
  }
  if (!record.contacts.some((c) => contactQualified(c, now))) {
    const statuses = [
      ...new Set(
        record.contacts.map((c) => c.verification?.status ?? "UNVERIFIED"),
      ),
    ];
    reasons.push(
      record.contacts.length
        ? `No fresh, bound, provider-verified email (${statuses.join(", ")})`
        : "No sourced public business email found",
    );
    pending = record.contacts.some(
      (c) => !c.verification || c.verification.status === "UNVERIFIED",
    );
  }
  if (
    product === "domains" &&
    (!record.domainMatch || record.domainMatch.ambiguous)
  )
    reasons.push(
      "Domain identity requires disambiguation or has no supported match",
    );
  if (product === "new" && !record.registrationDate)
    reasons.push("Missing official incorporation date");
  return {
    status: rejected
      ? "REJECTED"
      : reasons.length
        ? pending && reasons.length === 1
          ? "PENDING_VERIFICATION"
          : "NEEDS_REVIEW"
        : "QUALIFIED",
    reasons,
    activity,
    checkedAt: now.toISOString(),
  };
}
export function groundedEvidence(evidence: Evidence[]) {
  return evidence.filter(
    (e) =>
      /^https?:\/\//.test(e.url) && Number.isFinite(Date.parse(e.observedAt)),
  );
}
