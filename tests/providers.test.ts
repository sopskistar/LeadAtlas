import { describe, it, expect, vi, afterEach } from "vitest";
import {
  googlePlaceIds,
  metaKnownProfile,
} from "../src/lib/providers/restricted";
import { sourceRegistry } from "../src/lib/providers/registry";
import { discoveryUrls } from "../src/lib/providers/brave";
import { sourcedHunterContacts } from "../src/lib/providers/hunter-discovery";
import { business } from "./fixtures/business";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("permissions and provider contracts (fixture responses, not live access)", () => {
  it("keeps first-priority restricted integrations restricted even with tokens", () => {
    vi.stubEnv("META_ACCESS_TOKEN", "fixture-token");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "fixture-key");
    expect(
      sourceRegistry()
        .slice(0, 3)
        .every(
          (s) =>
            s.availability === "RESTRICTED" &&
            s.permittedExportFields.length === 0,
        ),
    ).toBe(true);
  });
  it("refuses Google without explicit reviewed use and Meta without approval", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "fixture-key");
    vi.stubEnv("GOOGLE_DISPLAY_APPROVED", "false");
    vi.stubEnv("META_APPROVAL_CONFIRMED", "false");
    await expect(googlePlaceIds("plumbers Toronto")).rejects.toThrow(
      "restricted",
    );
    await expect(metaKnownProfile("facebook", "123")).rejects.toThrow(
      "approval",
    );
  });
  it("Google requests only IDs and handles restricted responses", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "fixture-key");
    vi.stubEnv("GOOGLE_DISPLAY_APPROVED", "true");
    const transport = vi
      .fn()
      .mockResolvedValue(Response.json({ places: [{ id: "TEST-PLACE-ID" }] }));
    vi.stubGlobal("fetch", transport);
    expect(await googlePlaceIds("TEST permitted research")).toEqual([
      "TEST-PLACE-ID",
    ]);
    expect(transport.mock.calls[0][1].headers["X-Goog-FieldMask"]).toBe(
      "places.id",
    );
    transport.mockResolvedValue(Response.json({}, { status: 403 }));
    await expect(googlePlaceIds("TEST")).rejects.toThrow("403");
  });
  it("Brave returns transient URL clues, never snippets as evidence", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "fixture-key");
    const consume = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          web: {
            results: [
              {
                url: "https://company.example",
                description: "Unverified TEST snippet",
              },
            ],
          },
        }),
      ),
    );
    expect(await discoveryUrls("TEST business", consume)).toEqual([
      "https://company.example",
    ]);
    expect(consume).toHaveBeenCalledWith("brave");
  });
  it("Hunter sourced enrichment refuses inferred, stale, personal or unrelated source evidence", async () => {
    vi.stubEnv("HUNTER_API_KEY", "fixture-key");
    vi.stubEnv("HUNTER_REUSE_APPROVED", "true");
    const date = new Date().toISOString();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: {
            domain: "alpha.example",
            emails: [
              {
                value: "info@alpha.example",
                type: "generic",
                provenance: "found",
                sources: [
                  {
                    uri: "https://alpha.example/contact",
                    last_seen_on: date,
                    still_on_page: true,
                  },
                ],
              },
              {
                value: "guess@alpha.example",
                type: "generic",
                provenance: "inferred",
                sources: [],
              },
              {
                value: "employee@alpha.example",
                type: "personal",
                provenance: "found",
                sources: [
                  {
                    uri: "https://alpha.example/contact",
                    last_seen_on: date,
                    still_on_page: true,
                  },
                ],
              },
              {
                value: "directory@alpha.example",
                type: "generic",
                provenance: "found",
                sources: [
                  {
                    uri: "https://unrelated.example",
                    last_seen_on: date,
                    still_on_page: true,
                  },
                ],
              },
            ],
          },
        }),
      ),
    );
    const result = await sourcedHunterContacts(business(), vi.fn());
    expect(result.map((c) => c.email)).toEqual(["info@alpha.example"]);
    expect(result[0].verification).toBeUndefined();
  });
});
