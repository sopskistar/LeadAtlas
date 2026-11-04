import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("review@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Visual-Only-Passphrase-2026");
  const signedIn = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/sign-in/email"),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await signedIn).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
  await page
    .context()
    .storageState({ path: "/tmp/leadatlas-visual-auth.json" });
});

test("protected screens render, retain all data on mobile, and pass axe in both themes", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const path of [
    "/dashboard",
    "/leads",
    "/jobs",
    "/exports",
    "/settings/account",
    "/admin/sources",
    "/searches/visual-sample-search",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sample workspace", exact: true }),
    ).toBeVisible();
    if (path.includes("/searches/")) {
      await page.getByLabel("View", { exact: true }).selectOption("ALL");
      await expect(
        page.getByText("Example Plumbing Co.", { exact: true }),
      ).toBeVisible();
    }
    for (const theme of ["light", "dark"]) {
      await page
        .getByRole("combobox", { name: "Color theme", exact: true })
        .first()
        .selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((n) => n.target),
        })),
        `${path} ${theme}`,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
      await page.screenshot({
        path: `.hallmark/validation/visual-${info.project.name}-${path.replaceAll("/", "-")}-${theme}.png`,
        fullPage: true,
      });
    }
  }
});

test("saved research filters, evidence, notes and export exclusions work through actual APIs", async ({
  page,
}) => {
  await page.goto("/leads");
  await page.getByLabel("Search businesses").fill("Example Plumbing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText("Example Plumbing Co.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Example Repair Co.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(
    drawer.getByText("Source permissions", { exact: true }),
  ).toBeVisible();
  await drawer
    .getByLabel("Research notes")
    .fill("Saved through the real API in an isolated synthetic workspace.");
  await drawer.getByRole("button", { name: "Save notes & tags" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Lead saved." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByLabel("Research notes")).toHaveValue(
    "Saved through the real API in an isolated synthetic workspace.",
  );
  await page.keyboard.press("Escape");
  await page.goto("/searches/visual-sample-search");
  await page.getByLabel("View", { exact: true }).selectOption("ALL");
  await expect(
    page.getByText("Example Plumbing Co.", { exact: true }),
  ).toBeVisible();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/jobs/visual-sample-search/export") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Export qualified CSV", exact: true })
    .click();
  const exported = await response;
  expect(exported.status()).toBe(200);
  expect(exported.headers()["x-exported-count"]).toBe("0");
  expect(await exported.text()).not.toContain("hello@alpha.example");
});

test("all finder fields submit unchanged contracts with a clearly intercepted service fixture", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: { auth: true, search: true, registration: false, recovery: false },
    }),
  );
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/jobs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    payloads.push(route.request().postDataJSON());
    await route.fulfill({
      status: 503,
      json: {
        error: "Synthetic browser-test dispatch failure. No job created.",
      },
    });
  });
  for (const [path, product] of [
    ["/business-contacts", "contacts"],
    ["/website-opportunities", "opportunities"],
    ["/domain-buyer-finder", "domains"],
    ["/new-businesses", "new"],
  ]) {
    await page.goto(path);
    await page
      .getByLabel("City", { exact: true })
      .fill(product === "new" ? "Toronto" : "New York");
    if (product === "contacts" || product === "opportunities")
      await page.getByLabel("Business niche", { exact: true }).fill("plumber");
    if (product === "domains") {
      await page.getByLabel("Your domain", { exact: true }).fill("example.com");
      await page.locator('input[name="ownership"]').check();
    }
    if (product === "new") {
      await page.getByLabel("Incorporated from").fill("2026-10-01");
      await page.getByLabel("Incorporated through").fill("2026-10-30");
    }
    await page
      .getByRole("button", { name: "Start search", exact: true })
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "No job created",
    );
    expect(payloads.at(-1)).toMatchObject({
      product,
      limit: 10,
      queryBudget: 20,
    });
    if (product === "domains") {
      expect(payloads.at(-1)).toMatchObject({
        domain: "example.com",
        ownershipAffirmed: true,
        domainKind: "brandable",
      });
      await page.locator('input[type="file"]').setInputFiles({
        name: "sample-portfolio.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("Domain\nexample.com\nsample.example\n"),
      });
      await expect(
        page.getByText("2 domains loaded", { exact: true }),
      ).toBeVisible();
      const portfolioRequest = page.waitForRequest(
        (r) => r.url().endsWith("/api/jobs") && r.method() === "POST",
      );
      await page
        .getByRole("button", { name: "Start search", exact: true })
        .click();
      expect((await portfolioRequest).postDataJSON()).toMatchObject({
        product: "domains",
        domains: ["example.com", "sample.example"],
        ownershipAffirmed: true,
      });
    }
    if (product === "new")
      expect(payloads.at(-1)).toMatchObject({
        since: "2026-10-01",
        until: "2026-10-30",
        sources: ["overture", "imports", "canada"],
      });
  }
});

test("research rows and evidence remain usable at Hallmark's eight widths", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/searches/visual-sample-search");
    await page.getByLabel("View", { exact: true }).selectOption("ALL");
    await expect(
      page.getByText("Example Plumbing Co.", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Inspect", exact: true })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close evidence", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Research notes").scrollIntoViewIfNeeded();
    await expect(page.getByLabel("Research notes")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.hallmark/validation/evidence-${info.project.name}-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Inspect", exact: true }).first(),
    ).toBeFocused();
    await page.screenshot({
      path: `.hallmark/validation/results-${info.project.name}-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
