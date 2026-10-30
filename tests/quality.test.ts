import { describe, it, expect } from "vitest";
import { business, NOW } from "./fixtures/business";
import {
  assess,
  activityStatus,
  contactQualified,
  fresh,
} from "../src/lib/core/quality";
import { qualifiedCsv, csvCell } from "../src/lib/core/csv";
import {
  independentWebsite,
  identityKey,
  sameBusiness,
  mergeRecords,
} from "../src/lib/core/normalize";
import type { EmailStatus } from "../src/lib/core/types";
describe("qualification gates", () => {
  it("requires all five dimensions", () => {
    expect(assess(business({ fixture: false }), "contacts", NOW).status).toBe(
      "QUALIFIED",
    );
  });
  it("never exports fixtures as real leads", () => {
    expect(qualifiedCsv([business()], "contacts", NOW).count).toBe(0);
  });
  it("rejects permanently closed even if conflicting positive evidence exists", () => {
    const r = business({
      fixture: false,
      operatingStatus: "permanently_closed",
    });
    expect(activityStatus(r, NOW)).toBe("CONFLICTING");
    expect(assess(r, "contacts", NOW).status).toBe("REJECTED");
  });
  it("a single open listing is not proof of current trading", () => {
    const r = business({ fixture: false, evidence: [business().evidence[0]] });
    expect(activityStatus(r, NOW)).toBe("UNKNOWN");
    expect(assess(r, "contacts", NOW).status).toBe("NEEDS_REVIEW");
  });
  it("missing operating status stays unknown without independent signals", () => {
    expect(
      activityStatus(
        business({ operatingStatus: "unknown", evidence: [] }),
        NOW,
      ),
    ).toBe("UNKNOWN");
  });
  it("registration is not trading evidence", () => {
    const r = business({
      evidence: [
        {
          kind: "registration",
          source: "canada",
          url: "https://ised-isde.canada.ca/",
          observedAt: NOW.toISOString(),
          detail: "Legally active",
        },
      ],
    });
    expect(activityStatus(r, NOW)).toBe("UNKNOWN");
  });
  it("conflicting closure signals go to review", () => {
    const r = business({
      fixture: false,
      evidence: [
        ...business().evidence,
        {
          kind: "closure",
          url: "https://registry.example/closure",
          source: "test",
          observedAt: NOW.toISOString(),
          detail: "Closed",
        },
      ],
    });
    expect(assess(r, "contacts", NOW).status).toBe("NEEDS_REVIEW");
  });
  it.each([
    "INVALID",
    "CATCH_ALL",
    "UNKNOWN",
    "DISPOSABLE",
    "DO_NOT_MAIL",
    "UNVERIFIED",
  ] as EmailStatus[])("excludes %s from qualified export", (status) => {
    const r = business({ fixture: false });
    r.contacts[0].verification!.status = status;
    expect(qualifiedCsv([r], "contacts", NOW).count).toBe(0);
  });
  it("vendor-valid cannot establish the business association", () => {
    const r = business({ fixture: false });
    r.contacts[0].binding = "UNCERTAIN";
    expect(contactQualified(r.contacts[0], NOW)).toBe(false);
  });
  it("stale verification and website checks expire", () => {
    const r = business({ fixture: false });
    r.contacts[0].verification!.checkedAt = "2026-08-01T00:00:00Z";
    r.website!.checkedAt = "2026-08-01T00:00:00Z";
    expect(assess(r, "contacts", NOW).reasons.join()).toContain("stale");
    expect(qualifiedCsv([r], "contacts", NOW).count).toBe(0);
  });
  it("future evidence is not fresh", () => {
    expect(fresh("2027-01-01T00:00:00Z", 30, NOW)).toBe(false);
  });
  it("source rights remain a per-field gate", () => {
    const r = business({ fixture: false });
    r.fieldRights.name = { ...r.fieldRights.name, export: false };
    expect(qualifiedCsv([r], "contacts", NOW).count).toBe(0);
  });
  it("contact-specific rights cannot be borrowed from another source", () => {
    const r = business({ fixture: false });
    r.contacts[0].rights = { ...r.contacts[0].rights, export: false };
    expect(qualifiedCsv([r], "contacts", NOW).count).toBe(0);
  });
  it("suppression overrides prior verified status", () => {
    expect(
      qualifiedCsv(
        [business({ fixture: false, suppressed: true })],
        "contacts",
        NOW,
      ).count,
    ).toBe(0);
  });
  it("missing emails are explicit", () => {
    expect(
      assess(business({ fixture: false, contacts: [] }), "contacts", NOW)
        .reasons,
    ).toContain("No sourced public business email found");
  });
  it("broken website is not a website opportunity", () => {
    const r = business({ fixture: false });
    r.website!.status = "SITE_UNREACHABLE";
    expect(assess(r, "opportunities", NOW).status).not.toBe("QUALIFIED");
  });
  it("social-only with two documented absence checks can qualify", () => {
    const r = business({
      fixture: false,
      websites: [],
      socials: ["https://facebook.com/test"],
    });
    r.website!.status = "SOCIAL_ONLY";
    r.evidence.push(
      {
        kind: "absence",
        url: "https://chamber.example/alpha",
        observedAt: NOW.toISOString(),
        detail: "Independent website field checked",
        source: "user_review",
      },
      {
        kind: "absence",
        url: "https://licensed-directory.example/alpha",
        observedAt: NOW.toISOString(),
        detail: "No first-party site after identity research",
        source: "user_review",
      },
    );
    expect(assess(r, "opportunities", NOW).status).toBe("QUALIFIED");
    r.evidence.pop();
    expect(assess(r, "opportunities", NOW).status).toBe("NEEDS_REVIEW");
  });
});
describe("CSV and normalization", () => {
  it("exports exactly two columns, escapes CSV and normalizes email", () => {
    const r = business({ fixture: false, name: 'Alpha, "Plumbing"' });
    const result = qualifiedCsv([r, r], "contacts", NOW);
    expect(result.csv).toBe(
      'Business Name,Email\r\n"Alpha, ""Plumbing""",hello@alpha.example\r\n',
    );
    expect(result.skipped).toBe(1);
  });
  it.each([
    "=1+1",
    "+cmd",
    "@SUM(1)",
    "-1+1",
    "  =HYPERLINK()",
    "\tformula",
    "\rfoo",
  ])("blocks spreadsheet formula %j", (v) => {
    expect(csvCell(v)).toMatch(/^'?"?'|^"'/);
  });
  it.each([
    "https://facebook.com/a",
    "https://www.instagram.com/b",
    "https://yelp.com/biz/test",
    "https://maps.app.goo.gl/test",
  ])("classifies social/directory correctly %s", (u) =>
    expect(independentWebsite(u)).toBe(false),
  );
  it("normalizes duplicate business identity across sources", () => {
    const a = business();
    const b = business({ name: "Alpha Plumbing LLC", source: "overture" });
    expect(sameBusiness(a, b)).toBe(true);
    expect(identityKey(a)).toBe(identityKey(b));
    expect(mergeRecords(a, b).contacts).toHaveLength(1);
  });
  it("does not merge franchise branches based on a shared website", () => {
    expect(sameBusiness(business(), business({ city: "Albany" }))).toBe(false);
  });
});
