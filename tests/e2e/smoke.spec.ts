import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const finders = [
  ["/business-contacts", "Businesses With Websites"],
  ["/website-opportunities", "Businesses Without Websites"],
  ["/domain-buyer-finder", "Domain Buyer Finder"],
  ["/new-businesses", "New Business Finder"],
];

test("public, search and account screens pass automated WCAG checks in both themes", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const path of [
    "/",
    "/business-contacts",
    "/sign-up",
    "/forgot-password",
    "/tour",
  ]) {
    await page.goto(path);
    for (const theme of ["light", "dark"]) {
      await page
        .getByRole("combobox", { name: "Color theme", exact: true })
        .first()
        .selectOption(theme);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map(({ id, nodes }) => ({
          id,
          elements: nodes.map((node) => node.target),
        })),
        `${path} ${theme}`,
      ).toEqual([]);
    }
  }
});

test("homepage explains all five features and uses real brand assets", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Better Leads.Better Opportunities.",
  );
  const logo = page
    .getByRole("img", { name: "LeadAtlas", exact: true })
    .first();
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  for (const [, title] of [
    ...finders,
    ["/leads", "Lead Management & Export"],
  ]) {
    await expect(
      page
        .locator("#features")
        .getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByText("Illustrative preview", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional business · Sample only", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sources & coverage", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Uncertain stays uncertain", { exact: true }),
  ).toHaveCount(0);
});

test("all four finders preserve their routes and honest unavailable states", async ({
  page,
}) => {
  for (const [path, title] of finders) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start search", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText("Search temporarily unavailable.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /Configure Neon|Hunter is not configured|Set up sources|Workspace setup required/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("country selection retains every US and Canadian region", async ({
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

test("registration has password-manager fields, accessible eye controls and a real disabled state", async ({
  page,
  request,
}) => {
  await page.goto("/sign-up");
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeDisabled();
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("a secure generated passphrase");
  await expect(password).toHaveAttribute("autocomplete", "new-password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .press("Enter");
  await expect(password).toHaveAttribute("type", "password");
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveAttribute("autocomplete", "new-password");
  const response = await request.post("/api/auth/sign-up/email", {
    data: { name: "Not a real account" },
  });
  expect(response.status()).toBe(503);
});

test("configured UI fixture validates password confirmation without creating an account", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: { auth: true, registration: true, recovery: true, search: false },
    }),
  );
  await page.goto("/sign-up");
  await page.getByLabel("Your name", { exact: true }).fill("UI test fixture");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("fixture@example.com");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("short");
  expect(
    await password.evaluate(
      (input: HTMLInputElement) => input.validity.tooShort,
    ),
  ).toBe(true);
  await password.fill("a secure generated passphrase");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("a different secure passphrase");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "passwords don’t match",
  );
});

test("recovery is honest when unavailable and invalid reset links have a return path", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await expect(
    page.getByRole("button", { name: "Request reset link", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText(
    "temporarily unavailable",
  );
  await page.goto("/reset-password");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "invalid or has expired",
  );
  await expect(
    page.getByRole("link", { name: "Request a new link", exact: true }),
  ).toHaveAttribute("href", "/forgot-password");
});

test("recovery UI fixture keeps requests private and handles provider failure", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { auth: true, recovery: true } }),
  );
  await page.route("**/api/auth/request-password-reset", (route) =>
    route.fulfill({ json: { status: true } }),
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("fixture@example.com");
  await page
    .getByRole("button", { name: "Request reset link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "If this address matches an account",
  );
  await expect(page.getByRole("status")).not.toContainText("Email sent");
  await page.route("**/api/auth/request-password-reset", (route) =>
    route.fulfill({ status: 503, json: { message: "Unavailable" } }),
  );
  await page.reload();
  await page.getByLabel("Email address").fill("fixture@example.com");
  await page
    .getByRole("button", { name: "Request reset link", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
});

test("theme selection persists across pages and follows system changes", async ({
  page,
}) => {
  await page.goto("/");
  const theme = page
    .getByRole("combobox", { name: "Color theme", exact: true })
    .first();
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/business-contacts");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Color theme", exact: true })
    .first()
    .selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Color theme", exact: true })
    .first()
    .selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("mobile menus support labeled destinations, Escape and focus return", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.click();
  const menu = page.getByRole("dialog");
  await expect(
    menu.getByRole("link", {
      name: "Businesses Without Websites",
      exact: true,
    }),
  ).toBeVisible();
  for (let index = 0; index < 8; index++) await page.keyboard.press("Tab");
  expect(
    await menu.evaluate((dialog) => dialog.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu
    .getByRole("link", { name: "Businesses Without Websites", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Businesses Without Websites",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Lead Management & Export", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("private pages redirect anonymous sessions and technical settings remain protected", async ({
  page,
  request,
}) => {
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).not.toContain(
    "unsafe-eval",
  );
  const recovery = await request.get("/reset-password");
  expect(recovery.headers()["referrer-policy"]).toBe("no-referrer");
  expect(recovery.headers()["cache-control"]).toContain("no-store");
  for (const path of [
    "/leads",
    "/jobs",
    "/exports",
    "/settings/account",
    "/admin/sources",
    "/settings/sources",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in$/);
  }
  for (const path of [
    "/api/jobs",
    "/api/leads",
    "/api/exports",
    "/api/sources",
    "/api/admin/status",
  ]) {
    const response = await request.get(path);
    expect([401, 503]).toContain(response.status());
    expect(await response.text()).not.toMatch(
      /postgres(?:ql)?:\/\/|BETTER_AUTH_SECRET=|Configure Neon/,
    );
  }
});

test("zero-setup tour is clearly synthetic and has no export action", async ({
  page,
}) => {
  await page.goto("/tour");
  await expect(
    page.getByText("SYNTHETIC SAMPLE · NO LIVE LEADS", { exact: true }),
  ).toBeVisible();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Save the research worth keeping",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore workspace", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /export/i })).toHaveCount(0);
});

test("responsive pages render without overflow, browser errors or hydration warnings", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|did not match|Invalid DOM|React error/i.test(message.text()))
      errors.push(message.text());
  });
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/dashboard",
      "/business-contacts",
      "/website-opportunities",
      "/domain-buyer-finder",
      "/new-businesses",
      "/sign-up",
      "/forgot-password",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
    }
  }
  for (const theme of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of [
        "/",
        "/dashboard",
        "/business-contacts",
        "/sign-up",
        "/forgot-password",
      ]) {
        await page.goto(path);
        await page
          .getByRole("combobox", { name: "Color theme", exact: true })
          .first()
          .selectOption(theme);
        await page.screenshot({
          path: `test-results/after-${info.project.name}-${path.replaceAll("/", "") || "home"}-${width}-${theme}.png`,
          fullPage: true,
        });
      }
    }
  }
  expect(errors).toEqual([]);
  await page.goto("/business-contacts");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Start search", exact: true }),
  ).toBeVisible();
});
