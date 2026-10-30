import { beforeEach, describe, it, expect, vi } from "vitest";
const identity = vi.hoisted(() => ({
  value: null as null | { user: { id: string } },
}));
vi.mock("../src/lib/server/access", () => ({
  pageIdentity: async () => identity.value,
  isAdmin: (id: string) => id === "fixture-admin",
}));
import Page from "../src/app/(workspace)/[...slug]/page";
import { Sources } from "../src/components/sources";
beforeEach(() => {
  identity.value = null;
});
describe("server-rendered private page authorization", () => {
  it("renders the operations page for an explicitly authorized administrator", async () => {
    identity.value = { user: { id: "fixture-admin" } };
    const page = await Page({
      params: Promise.resolve({ slug: ["admin", "sources"] }),
    });
    expect(page.type).toBe(Sources);
  });
  it("redirects anonymous direct navigation to sign in", async () => {
    for (const slug of [
      ["admin", "sources"],
      ["leads"],
      ["exports"],
      ["jobs"],
      ["settings", "account"],
      ["searches", "fixture-id"],
    ]) {
      await expect(
        Page({ params: Promise.resolve({ slug }) }),
      ).rejects.toMatchObject({
        digest: expect.stringContaining("NEXT_REDIRECT"),
      });
    }
  });
  it("denies a signed-in ordinary user direct access to source operations", async () => {
    identity.value = { user: { id: "fixture-customer" } };
    await expect(
      Page({ params: Promise.resolve({ slug: ["admin", "sources"] }) }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });
  it("preserves the old settings URL as a redirect into the protected route", async () => {
    await expect(
      Page({ params: Promise.resolve({ slug: ["settings", "sources"] }) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/admin/sources"),
    });
  });
});
