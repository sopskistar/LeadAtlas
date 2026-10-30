import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyEmail, hunterStatus } from "../src/lib/providers/email";
import { business } from "./fixtures/business";
const mx = vi
  .fn()
  .mockResolvedValue([{ exchange: "mx.example", priority: 10 }]);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mx.mockResolvedValue([{ exchange: "mx.example", priority: 10 }]);
});
describe("real verifier connector contract with fixture transport", () => {
  it("maps current valid status without deprecated result field", () =>
    expect(hunterStatus("valid")).toBe("LIKELY_DELIVERABLE"));
  it("retains a provider's actual older verification date", async () => {
    vi.stubEnv("HUNTER_API_KEY", "test-key");
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        data: { status: "valid", verification: { date: "2026-09-14" } },
      }),
    );
    const result = await verifyEmail(business().contacts[0], vi.fn(), {
      resolveMx: mx,
      fetch: fetcher,
    });
    expect(result.checkedAt).toBe("2026-09-14T00:00:00.000Z");
    expect(result.status).toBe("LIKELY_DELIVERABLE");
  });
  it("missing provider credentials remain unverified after MX", async () => {
    vi.stubEnv("HUNTER_API_KEY", "");
    const fetcher = vi.fn();
    const result = await verifyEmail(business().contacts[0], vi.fn(), {
      resolveMx: mx,
      fetch: fetcher,
    });
    expect(result.status).toBe("UNVERIFIED");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("no MX is invalid while transient DNS failure is unverified", async () => {
    mx.mockRejectedValueOnce({ code: "ENOTFOUND" }).mockRejectedValueOnce({
      code: "ETIMEOUT",
    });
    expect(
      (
        await verifyEmail(business().contacts[0], vi.fn(), {
          resolveMx: mx,
          fetch: vi.fn(),
        })
      ).status,
    ).toBe("INVALID");
    expect(
      (
        await verifyEmail(business().contacts[0], vi.fn(), {
          resolveMx: mx,
          fetch: vi.fn(),
        })
      ).status,
    ).toBe("UNVERIFIED");
  });
  it.each([
    ["accept_all", "CATCH_ALL"],
    ["unknown", "UNKNOWN"],
    ["invalid", "INVALID"],
    ["disposable", "DISPOSABLE"],
    ["do_not_mail", "DO_NOT_MAIL"],
    ["webmail", "UNKNOWN"],
  ])("maps %s safely", async (status, expected) => {
    vi.stubEnv("HUNTER_API_KEY", "test");
    const result = await verifyEmail(business().contacts[0], vi.fn(), {
      resolveMx: mx,
      fetch: vi.fn().mockResolvedValue(
        Response.json({
          data: { status, verification: { date: "2026-10-30" } },
        }),
      ),
    });
    expect(result.status).toBe(expected);
  });
  it("a vendor blocked SMTP check is unknown, not valid", async () => {
    vi.stubEnv("HUNTER_API_KEY", "test");
    const r = await verifyEmail(business().contacts[0], vi.fn(), {
      resolveMx: mx,
      fetch: vi
        .fn()
        .mockResolvedValue(
          Response.json({ data: { status: "valid", block: true } }),
        ),
    });
    expect(r.status).toBe("UNKNOWN");
  });
  it.each([202, 222, 429, 503])(
    "provider HTTP %s cannot become valid",
    async (status) => {
      vi.stubEnv("HUNTER_API_KEY", "test");
      expect(
        (
          await verifyEmail(business().contacts[0], vi.fn(), {
            resolveMx: mx,
            fetch: vi.fn().mockResolvedValue(Response.json({}, { status })),
          })
        ).status,
      ).toBe("UNVERIFIED");
    },
  );
  it("honors provider no-processing requests", async () => {
    vi.stubEnv("HUNTER_API_KEY", "test");
    expect(
      (
        await verifyEmail(business().contacts[0], vi.fn(), {
          resolveMx: mx,
          fetch: vi.fn().mockResolvedValue(Response.json({}, { status: 451 })),
        })
      ).status,
    ).toBe("DO_NOT_MAIL");
  });
  it("missing provider verification date cannot establish freshness", async () => {
    vi.stubEnv("HUNTER_API_KEY", "test");
    expect(
      (
        await verifyEmail(business().contacts[0], vi.fn(), {
          resolveMx: mx,
          fetch: vi
            .fn()
            .mockResolvedValue(Response.json({ data: { status: "valid" } })),
        })
      ).status,
    ).toBe("UNVERIFIED");
  });
  it("quota failures do not produce valid contacts", async () => {
    vi.stubEnv("HUNTER_API_KEY", "test");
    expect(
      (
        await verifyEmail(
          business().contacts[0],
          vi.fn().mockRejectedValue(new Error("quota")),
          { resolveMx: mx, fetch: vi.fn() },
        )
      ).status,
    ).toBe("UNVERIFIED");
  });
});
