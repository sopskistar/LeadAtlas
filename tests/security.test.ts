import { describe, it, expect } from "vitest";
import { publicIp, publicUrl } from "../src/worker/safe-fetch";
import {
  signWorker,
  validWorkerSignature,
} from "../src/lib/server/worker-auth";
import { extractPage } from "../src/lib/core/extract";
import { page } from "./fixtures/business";
import { parseImport } from "../src/lib/server/imports";
import { stableJson } from "../src/lib/core/normalize";
describe("worker and crawl security", () => {
  it("compares persisted JSONB idempotency inputs regardless of property order", () => {
    expect(
      stableJson({ country: "CA", city: "Toronto", sources: ["imports"] }),
    ).toBe(
      stableJson({ sources: ["imports"], city: "Toronto", country: "CA" }),
    );
  });
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.2.3",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("blocks private/reserved IP %s", (ip) => expect(publicIp(ip)).toBe(false));
  it("allows normal public addresses", () => {
    expect(publicIp("8.8.8.8")).toBe(true);
    expect(publicIp("2606:4700:4700::1111")).toBe(true);
  });
  it.each([
    "file:///etc/passwd",
    "http://localhost/foo",
    "http://169.254.169.254/latest/meta-data",
    "https://example.com:8080",
    "https://user:pass@example.com",
    "http://0x7f000001",
  ])("rejects unsafe URL %s", (u) => expect(() => publicUrl(u)).toThrow());
  it("authenticates body and timestamp with tamper/replay-window rejection", () => {
    const secret = "s".repeat(40);
    const time = "1793361600000";
    const sig = signWorker("body", time, secret);
    expect(validWorkerSignature("body", time, sig, secret, Number(time))).toBe(
      true,
    );
    expect(
      validWorkerSignature("altered", time, sig, secret, Number(time)),
    ).toBe(false);
    expect(
      validWorkerSignature("body", time, sig, secret, Number(time) + 61000),
    ).toBe(false);
  });
  it("detects a functioning identity-matched website and email", () => {
    const result = extractPage(page, "Alpha Plumbing");
    expect(result.functional).toBe(true);
    expect(result.emails).toContain("hello@alpha.example");
  });
  it("refuses parked, blank, anti-bot and wrong-identity pages", () => {
    expect(
      extractPage(
        "<html><title>Buy this domain</title><body>This domain is for sale</body></html>",
        "Alpha Plumbing",
      ).parked,
    ).toBe(true);
    expect(
      extractPage(
        "<html><title>Alpha Plumbing</title><body>Enable JavaScript and verify you are human</body></html>",
        "Alpha Plumbing",
      ).blocked,
    ).toBe(true);
    expect(extractPage(page, "Wrong Business").functional).toBe(false);
    expect(extractPage("", "Alpha Plumbing").functional).toBe(false);
  });
  it("does not harvest script-only or synthetic image emails", () => {
    const result = extractPage(
      '<body><script>const e="private@alpha.example";</script><p>icon@2x.png</p></body>',
      "Alpha",
    );
    expect(result.emails).toHaveLength(0);
  });
  it("does not trust imported verification claims", () => {
    const input = {
      source: "imports" as const,
      sourceUrl: "https://directory.example",
      license: "TEST",
      attribution: "TEST",
      permissionConfirmed: true as const,
      format: "jsonl" as const,
      content: JSON.stringify({
        source_id: "one",
        name: "Alpha Plumbing",
        country: "CA",
        region: "ON",
        city: "Toronto",
        niche: "plumber",
        emails: "hello@alpha.example",
        email_source_url: "https://directory.example/alpha",
        verification: { status: "valid" },
      }),
    };
    expect(parseImport(input)[0].contacts[0].verification).toBeUndefined();
  });
  it("rejects missing email provenance and unknown Overture licensing", () => {
    const input = {
      source: "overture" as const,
      sourceUrl: "https://docs.overturemaps.org",
      license: "TEST",
      attribution: "TEST",
      permissionConfirmed: true as const,
      format: "jsonl" as const,
      content: JSON.stringify({
        source_id: "one",
        name: "Alpha Plumbing",
        country: "CA",
        region: "ON",
        city: "Toronto",
        niche: "plumber",
        emails: "hello@alpha.example",
      }),
    };
    expect(() => parseImport(input)).toThrow();
  });
});
