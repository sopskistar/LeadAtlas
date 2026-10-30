import { afterEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, sendAuthEmail } from "../src/lib/server/email";
import { POST } from "../src/app/api/auth/[...all]/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function configure() {
  vi.stubEnv("RESEND_API_KEY", "fixture-only-key");
  vi.stubEnv("AUTH_EMAIL_FROM", "LeadAtlas <auth@example.com>");
  vi.stubEnv("AUTH_EMAIL_SENDER_VERIFIED", "true");
  vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
}
describe("transactional authentication email", () => {
  it("requires explicit verified sender configuration and never attempts unconfigured delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(emailConfigured()).toBe(false);
    await expect(
      sendAuthEmail(
        "test@example.com",
        "https://app.example.com/reset-password",
        "reset",
      ),
    ).rejects.toThrow("unavailable");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends to the real API contract and requires provider acceptance", async () => {
    configure();
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "fixture-accepted-id" }));
    vi.stubGlobal("fetch", fetcher);
    await sendAuthEmail(
      "test@example.com",
      "https://app.example.com/reset-password?token=fixture",
      "reset",
    );
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body)).toMatchObject({
      to: ["test@example.com"],
      subject: "Reset your LeadAtlas password",
    });
    fetcher.mockResolvedValueOnce(
      Response.json({ error: "provider fixture failure" }, { status: 503 }),
    );
    await expect(
      sendAuthEmail(
        "test@example.com",
        "https://app.example.com/reset-password",
        "reset",
      ),
    ).rejects.toThrow("rejected");
    fetcher.mockResolvedValueOnce(Response.json({}));
    await expect(
      sendAuthEmail(
        "test@example.com",
        "https://app.example.com/reset-password",
        "reset",
      ),
    ).rejects.toThrow("did not accept");
  });
  it("rejects reset links outside the configured origin before contacting the provider", async () => {
    configure();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      sendAuthEmail(
        "test@example.com",
        "https://attacker.example/reset",
        "reset",
      ),
    ).rejects.toThrow("origin");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("fails closed on production signup and recovery when email is not configured", async () => {
    configure();
    vi.stubEnv("DATABASE_URL", "postgres://fixture-only/unused");
    vi.stubEnv(
      "BETTER_AUTH_SECRET",
      "fixture-only-secret-with-at-least-32-characters",
    );
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    for (const path of [
      "sign-up/email",
      "request-password-reset",
      "send-verification-email",
    ]) {
      const response = await POST(
        new Request(`https://app.example.com/api/auth/${path}`, {
          method: "POST",
        }),
      );
      expect(response.status).toBe(503);
      expect(await response.text()).not.toMatch(
        /Neon|RESEND|postgres|secret|fixture/,
      );
    }
  });
});
