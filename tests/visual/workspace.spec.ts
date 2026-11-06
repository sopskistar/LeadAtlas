import { test, expect, type Cookie } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Reuse a real session within each worker, as a customer would. Repeated login
// attempts must not bypass or weaken the production authentication rate limits.
let authenticatedCookies: Cookie[] = [];
test.beforeEach(async ({ page }) => {
  if (authenticatedCookies.length) {
    await page.context().addCookies(authenticatedCookies);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Sample workspace", exact: true }),
    ).toBeVisible();
    return;
  }
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
  authenticatedCookies = await page.context().cookies();
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
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
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

test("finder contracts preserve local fields and submit worldwide domains with a clearly intercepted service fixture", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        auth: true,
        search: true,
        domainSearch: true,
        registration: false,
        recovery: false,
      },
    }),
  );
  await page.route("**/api/source-preferences**", async (route) => {
    const request = route.request();
    const available = ["overture", "imports"];
    if (request.method() === "PUT")
      return route.fulfill({
        json: { selected: request.postDataJSON().sources },
      });
    return route.fulfill({
      json: {
        supported: available,
        selected: available,
        catalog: [
          ["google", "Google Maps", "AWAITING_APPROVAL"],
          ["bing", "Bing Search", "NOT_CONNECTED"],
          ["facebook", "Facebook Pages", "AWAITING_APPROVAL"],
          [
            "instagram",
            "Instagram Professional Business Profiles",
            "AWAITING_APPROVAL",
          ],
          ["google_search", "Google Search", "NOT_CONNECTED"],
          ["brave", "Brave Search", "NOT_CONNECTED"],
          ["overture", "Overture Places", "AVAILABLE"],
          ["imports", "Authorized directories & chamber listings", "AVAILABLE"],
        ].map(([id, name, state]) => ({
          id,
          name,
          state,
          reason:
            state === "AVAILABLE"
              ? "Authorized synthetic source"
              : "Not connected",
        })),
      },
    });
  });
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
    if (product !== "domains")
      await page
        .getByLabel("City", { exact: true })
        .fill(product === "new" ? "Toronto" : "New York");
    if (product !== "domains")
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
    });
    if (product === "contacts" || product === "opportunities")
      expect(payloads.at(-1)).toMatchObject({
        sources: ["overture", "imports"],
      });
    expect(payloads.at(-1)).not.toHaveProperty("limit");
    expect(payloads.at(-1)).not.toHaveProperty("queryBudget");
    if (product === "domains") {
      for (const key of ["country", "region", "city", "niche"])
        expect(payloads.at(-1)).not.toHaveProperty(key);
      expect(payloads.at(-1)).toMatchObject({
        domain: "example.com",
        ownershipAffirmed: true,
        domainKind: "auto",
        scope: "global",
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

test("business finder source choices persist independently and unavailable channels stay disabled", async ({
  page,
}) => {
  const choices = new Map<string, string[]>();
  const available = ["overture", "imports"];
  await page.route("**/api/source-preferences**", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const body = request.postDataJSON() as {
        product: string;
        sources: string[];
      };
      choices.set(body.product, body.sources);
      return route.fulfill({ json: { selected: body.sources } });
    }
    const product =
      new URL(request.url()).searchParams.get("product") ?? "contacts";
    return route.fulfill({
      json: {
        supported: available,
        selected: choices.get(product) ?? available,
        catalog: [
          ["google", "Google Maps", "AWAITING_APPROVAL"],
          ["bing", "Bing Search", "NOT_CONNECTED"],
          ["facebook", "Facebook Pages", "AWAITING_APPROVAL"],
          [
            "instagram",
            "Instagram Professional Business Profiles",
            "AWAITING_APPROVAL",
          ],
          ["google_search", "Google Search", "NOT_CONNECTED"],
          ["brave", "Brave Search", "NOT_CONNECTED"],
          ["overture", "Overture Places", "AVAILABLE"],
          ["imports", "Authorized directories & chamber listings", "AVAILABLE"],
        ].map(([id, name, state]) => ({
          id,
          name,
          state,
          reason:
            state === "AVAILABLE" ? "Authorized test source" : "Not connected",
        })),
      },
    });
  });

  await page.goto("/business-contacts");
  const contacts = page.getByRole("group", { name: "Lead sources" });
  await expect(contacts.getByLabel("Google Maps")).toBeDisabled();
  await expect(contacts.getByLabel("Overture Places")).toBeChecked();
  await contacts
    .getByLabel("Authorized directories & chamber listings")
    .uncheck();
  await expect.poll(() => choices.get("contacts")).toEqual(["overture"]);

  await page.goto("/website-opportunities");
  const opportunities = page.getByRole("group", { name: "Lead sources" });
  await expect(
    opportunities.getByLabel("Authorized directories & chamber listings"),
  ).toBeChecked();

  await page.goto("/business-contacts");
  await expect(
    page
      .getByRole("group", { name: "Lead sources" })
      .getByLabel("Authorized directories & chamber listings"),
  ).not.toBeChecked();
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
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
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
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
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

test("worldwide domain results expose relationship, evidence and verification without implying intent", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/searches/visual-domain-search");
  await expect(page.locator("h1")).toHaveText("novalithfixture.com");
  await expect(
    page.locator("main p").filter({ hasText: "Worldwide" }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("View", { exact: true })).toHaveValue(
    "SHORTLIST",
  );
  await page.getByLabel("View", { exact: true }).selectOption("ALL");
  const table = page.getByRole("region", {
    name: "Domain buyer research table",
  });
  await expect(
    table.getByText("Novalith Fixture", { exact: true }),
  ).toBeVisible();
  for (const name of [
    "Current website",
    "Domain relationship",
    "Website / business",
    "Last checked",
  ])
    await expect(
      table.getByRole("columnheader", { name, exact: true }),
    ).toBeAttached();
  for (const theme of ["light", "dark"]) {
    await page
      .getByRole("combobox", { name: "Color theme", exact: true })
      .first()
      .selectOption(theme);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({
      path: `.hallmark/validation/domain-results-${info.project.name}-${theme}.png`,
      fullPage: true,
    });
  }
  const originalViewport = page.viewportSize()!;
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      `domain table ${width}`,
    ).toBe(true);
    await page.screenshot({
      path: `.hallmark/validation/domain-width-${info.project.name}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize(originalViewport);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect(
    await table
      .locator("table")
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe("table");
  expect(
    await table
      .locator("td")
      .nth(1)
      .evaluate((element) => getComputedStyle(element, "::before").content),
  ).toBe("none");
  await table.focus();
  await expect(table).toBeFocused();
  if (info.project.name === "mobile") {
    await table.press("ArrowRight");
    await table.press("ArrowRight");
    await expect
      .poll(() => table.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  }
  await table.getByRole("button", { name: "Inspect", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Researched domain: novalithfixture.com");
  await expect(dialog).toContainText("no evidence of buying intent");
  await page.screenshot({
    path: `.hallmark/validation/domain-evidence-${info.project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(
    table.getByRole("button", { name: "Inspect", exact: true }),
  ).toBeFocused();
});

test("private testimonial workflow saves a draft and never publishes it without permission", async ({
  page,
}) => {
  await page.goto("/admin/testimonials");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Customer testimonials",
  );
  await page
    .getByLabel("Customer display name", { exact: true })
    .fill("TEST REVIEWER - NOT REAL");
  await page
    .getByLabel("Role or business", { exact: true })
    .fill("TEST FIXTURE COMPANY");
  await page
    .getByLabel("Approved testimonial text", { exact: true })
    .fill(
      "TEST FIXTURE ONLY. This is not a genuine review and must remain unpublished.",
    );
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Review saved");
  await expect(
    page
      .getByRole("button", {
        name: "Edit TEST REVIEWER - NOT REAL",
        exact: true,
      })
      .first(),
  ).toBeVisible();
  const response = await page.request.get("/api/testimonials");
  expect(response.status()).toBe(200);
  expect((await response.json()).reviews).toEqual([]);
  await page.goto("/");
  await expect(page.locator(".testimonial-section")).toHaveCount(0);
  await page.goto("/admin/testimonials");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
