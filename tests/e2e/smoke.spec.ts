import { test, expect } from "@playwright/test";
test("brand assets and the four independent products render without fake results", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Find businesses.Find opportunities.",
  );
  const logo = page.getByRole("img", { name: "LeadAtlas" });
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  for (const [path, title] of [
    ["/business-contacts", "Business Contact Finder"],
    ["/website-opportunities", "Website Opportunity Finder"],
    ["/domain-buyer-finder", "Domain Buyer Finder"],
    ["/new-businesses", "New Business Finder"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start search", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
test("source restrictions and setup states are explicit", async ({ page }) => {
  await page.goto("/settings/sources");
  await expect(
    page.getByRole("heading", { name: "Sources & integrations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Facebook Pages", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("RESTRICTED", { exact: true })).toHaveCount(3);
  await expect(
    page.getByText("HUNTER KEY MISSING", { exact: true }),
  ).toBeVisible();
});
test("country selection exposes all regions and supports arbitrary city/niche", async ({
  page,
}) => {
  await page.goto("/business-contacts");
  await expect(
    page
      .getByRole("combobox", { name: "State", exact: true })
      .locator("option"),
  ).toHaveCount(51);
  await page.getByLabel("Country", { exact: true }).selectOption("CA");
  await expect(
    page
      .getByRole("combobox", { name: "Province / territory", exact: true })
      .locator("option"),
  ).toHaveCount(13);
  await page.getByLabel("City", { exact: true }).fill("Toronto");
  await page
    .getByLabel("Business niche", { exact: true })
    .fill("custom industrial service");
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Toronto");
});
test("account creation cannot pretend to work without database configuration", async ({
  page,
  request,
}) => {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "New to LeadAtlas? Create account" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeDisabled();
  const response = await request.get("/api/jobs");
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain("Setup required");
});
test("private API actions fail closed and do not expose credentials", async ({
  request,
}) => {
  for (const path of [
    "/api/jobs",
    "/api/leads",
    "/api/exports",
    "/api/sources",
  ]) {
    const response = await request.get(path);
    expect([401, 503]).toContain(response.status());
    const text = await response.text();
    expect(text).not.toMatch(/postgres(?:ql)?:\/\/|BETTER_AUTH_SECRET=/);
  }
  const response = await request.post("/api/jobs", {
    data: { product: "contacts" },
  });
  expect([401, 503]).toContain(response.status());
});

test("workspace screenshot for responsive inspection", async ({
  page,
}, testInfo) => {
  await page.goto("/business-contacts");
  await expect(
    page.getByRole("heading", { name: "Business Contact Finder", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/workspace-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
