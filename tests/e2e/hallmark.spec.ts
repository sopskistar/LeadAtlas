import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Hallmark widths keep the primary action, navigation, forms and content usable", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/business-contacts",
      "/domain-buyer-finder",
      "/sign-in",
    ]) {
      await page.goto(path);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} ${width}`,
      ).toBe(true);
      await page.screenshot({
        path: `.hallmark/validation/hallmark-${info.project.name}-${path.replaceAll("/", "") || "home"}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Explore LeadAtlas", exact: true }),
  ).toBeInViewport();
  await expect(page.locator("h1")).toBeInViewport();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/business-contacts");
  const disclosure = page.getByText("Qualification & coverage", {
    exact: true,
  });
  await expect(
    page.getByText("Use permitted records matching your location and niche.", {
      exact: true,
    }),
  ).not.toBeVisible();
  await disclosure.click();
  await expect(
    page.getByText("Use permitted records matching your location and niche.", {
      exact: true,
    }),
  ).toBeVisible();
  await disclosure.click();
  await expect(
    page.getByText("Use permitted records matching your location and niche.", {
      exact: true,
    }),
  ).not.toBeVisible();
});

test("additional finder and recovery states pass accessibility checks in both themes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const path of [
    "/website-opportunities",
    "/domain-buyer-finder",
    "/new-businesses",
    "/sign-in",
    "/reset-password",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("status").filter({ hasText: "temporarily unavailable" }),
    ).toBeVisible();
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
      await page.screenshot({
        path: `.hallmark/validation/additional-${info.project.name}-${path.replaceAll("/", "")}-${theme}.png`,
        fullPage: true,
      });
    }
  }
});
