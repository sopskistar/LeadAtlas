import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const names = [
  "Businesses With Websites",
  "Businesses Without Websites",
  "Domain Buyer Finder",
  "New Business Finder",
];
const paths = [
  "/business-contacts",
  "/website-opportunities",
  "/domain-buyer-finder",
  "/new-businesses",
];
test("transparent shared logo, four unchanged cards and restored five-row directory work at eight widths", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const cards = page.locator("#features > a"),
      rows = page.locator("#feature-directory .feature-row");
    await expect(cards).toHaveCount(4);
    await expect(rows).toHaveCount(5);
    await expect(page.locator("#features h2")).toHaveText(names);
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).toHaveAttribute("href", paths[i]);
      await expect(rows.nth(i)).toHaveAttribute("href", paths[i]);
    }
    await expect(rows.nth(4)).toHaveAttribute("href", "/leads");
    const order = await page
      .locator("main > section")
      .evaluateAll((elements) =>
        elements.slice(0, 4).map((e) => e.id || e.className),
      );
    expect(order).toEqual([
      "hero",
      "features",
      "feature-directory",
      "quality-section",
    ]);
    const boxes = await Promise.all(
      [0, 1, 2, 3].map((i) => cards.nth(i).boundingBox()),
    );
    if (width > 640) {
      expect(boxes[0]!.y).toBe(boxes[1]!.y);
      expect(boxes[2]!.x).toBe(boxes[0]!.x);
    } else expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("combobox", { name: "Color theme", exact: true })
      .first()
      .selectOption("dark");
    const logo = page
      .getByRole("link", { name: "LeadAtlas home", exact: true })
      .first();
    await expect(logo.locator("img")).toHaveAttribute(
      "src",
      /leadatlas-icon-v2/,
    );
    expect(
      await logo.evaluate((e) => ({
        background: getComputedStyle(e).backgroundColor,
        padding: getComputedStyle(e).padding,
      })),
    ).toEqual({ background: "rgba(0, 0, 0, 0)", padding: "0px" });
    await expect(page.locator('img[src*="wordmark"]')).toHaveCount(0);
    await page.screenshot({
      path: `.hallmark/validation/final-homepage-${test.info().project.name}-${width}-dark.png`,
      fullPage: true,
    });
  }
});
test("updates signup is honest when unavailable and testimonials stay hidden without approved reviews", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".testimonial-section")).toHaveCount(0);
  const form = page.getByRole("form", { name: "Product updates subscription" });
  await expect(
    form.getByText("Updates signup is temporarily unavailable.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Subscribe to updates" }),
  ).toBeDisabled();
  await expect(form.getByRole("checkbox")).not.toBeChecked();
});
test("updates form handles real contract states without claiming subscription before confirmation", async ({
  page,
}) => {
  let releaseFailure!: () => void;
  const pending = new Promise<void>((resolve) => {
    releaseFailure = resolve;
  });
  await page.route("**/api/updates", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ email: "fixture@example.com", consent: true });
    await pending;
    return route.fulfill({
      status: 503,
      json: {
        error: "Synthetic persistence failure. No subscription activated.",
      },
    });
  });
  await page.goto("/");
  const form = page.getByRole("form", { name: "Product updates subscription" });
  await form
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill("fixture@example.com");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Subscribe to updates" }).click();
  await expect(
    form.getByRole("button", { name: "Recording request…" }),
  ).toBeDisabled();
  await expect(form).toHaveAttribute("aria-busy", "true");
  releaseFailure();
  await expect(form.getByRole("alert")).toContainText(
    "No subscription activated",
  );
  await page.unroute("**/api/updates");
  await page.route("**/api/updates", (route) =>
    route.fulfill({
      status: 202,
      json: {
        message: "Request recorded. Confirm by email before updates begin.",
      },
    }),
  );
  await form.getByRole("button", { name: "Subscribe to updates" }).click();
  await expect(form.getByRole("status")).toContainText("Confirm by email");
});

test("email action pages require explicit confirmation and present unsubscribe success only after POST", async ({
  page,
}) => {
  const token = "a".repeat(64);
  for (const mode of ["confirm", "unsubscribe"] as const) {
    let posts = 0;
    await page.route(`**/api/updates/${mode}`, (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ token });
      posts++;
      return route.fulfill({
        json: { message: `TEST FIXTURE ONLY: ${mode} recorded.` },
      });
    });
    const response = await page.goto(`/updates/${mode}?token=${token}`);
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(posts).toBe(0);
    await page
      .getByRole("button", {
        name: mode === "confirm" ? "Confirm subscription" : "Unsubscribe",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      `TEST FIXTURE ONLY: ${mode} recorded.`,
    );
    expect(posts).toBe(1);
    await expect(
      page.getByRole("link", { name: "Return to LeadAtlas" }),
    ).toHaveAttribute("href", "/");
  }
  await page.goto("/updates/confirm");
  await expect(
    page.getByRole("button", { name: "Confirm subscription" }),
  ).toBeDisabled();
  await expect(page.locator("main form").getByRole("alert")).toContainText(
    "This link is invalid",
  );
});

test("testimonial layout renders only supplied published records and remains accessible", async ({
  page,
}) => {
  // Browser-only fixture: nothing is written to the application database or published.
  await page.route("**/api/testimonials", (route) =>
    route.fulfill({
      json: {
        reviews: [
          {
            id: "fixture",
            displayName: "TEST REVIEWER — NOT REAL",
            roleOrBusiness: "TEST BUSINESS",
            text: "TEST FIXTURE ONLY. This is not an actual customer review.",
            photoPath: null,
            publishedAt: "2026-01-01T12:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "From LeadAtlas customers.",
  });
  await expect(section.getByRole("blockquote")).toContainText(
    "TEST FIXTURE ONLY",
  );
  await expect(section.locator("time")).toHaveAttribute(
    "datetime",
    "2026-01-01T12:00:00.000Z",
  );
  const results = await new AxeBuilder({ page })
    .include(".testimonial-section")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("homepage light, dark and system themes pass accessibility and links retain keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");
  for (const theme of ["light", "dark", "system"]) {
    await page.emulateMedia({ colorScheme: "dark" });
    await page
      .getByRole("combobox", { name: "Color theme", exact: true })
      .first()
      .selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme === "light" ? "light" : "dark",
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  for (const [i, path] of paths.entries()) {
    await page.goto("/");
    const link = page.locator("#feature-directory .feature-row").nth(i);
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});
