import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("dependent geography supports browse, regional reset, keyboard choice and custom entries", async ({
  page,
}) => {
  await page.goto("/business-contacts");
  const city = page.getByRole("combobox", { name: "City", exact: true });
  await city.fill("New York");
  await expect(
    page.getByRole("option", { name: "New York City", exact: true }),
  ).toBeVisible();
  await city.press("ArrowDown");
  await city.press("Enter");
  await expect(city).toHaveValue("New York City");
  const state = page.getByRole("combobox", { name: "State", exact: true });
  await state.fill("California");
  await state.press("ArrowDown");
  await state.press("Enter");
  await expect(state).toHaveValue("California");
  await expect(city).toHaveValue("");
  await city.fill("New York");
  await expect(
    page.getByText("No suggestions. Custom entries are welcome."),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "New York City", exact: true }),
  ).toHaveCount(0);
  await city.fill("Fixture custom hamlet");
  await city.press("ArrowDown");
  await city.press("Enter");
  await expect(city).toHaveValue("Fixture custom hamlet");
  await page.getByLabel("Business niche", { exact: true }).fill("Plumber");
  await expect(city).toHaveValue("Fixture custom hamlet");
  const country = page.getByRole("combobox", { name: "Country", exact: true });
  await country.fill("Canada");
  await country.press("ArrowDown");
  await country.press("Enter");
  await expect(city).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Province / territory", exact: true }),
  ).toHaveValue("Ontario");
  await city.fill("Toro");
  await expect(
    page.getByRole("option", { name: "Toronto", exact: true }),
  ).toBeVisible();
  await city.press("ArrowDown");
  await city.press("Enter");
  await expect(city).toHaveValue("Toronto");
  await city.click();
  await city.press("Escape");
  await expect(city).toHaveAttribute("aria-expanded", "false");
});

test("niche synonyms and custom choices remain keyboard accessible in both themes", async ({
  page,
}) => {
  await page.goto("/website-opportunities");
  const niche = page.getByRole("combobox", {
    name: "Business niche",
    exact: true,
  });
  await niche.fill("plum");
  for (const label of ["Plumber", "Plumbing contractor", "Plumbing services"])
    await expect(
      page.getByRole("option", { name: label, exact: true }),
    ).toBeVisible();
  await niche.press("ArrowDown");
  await niche.press("Enter");
  await expect(niche).toHaveValue("Plumber");
  await niche.fill("Fixture specialist niche");
  await niche.press("ArrowDown");
  await niche.press("Enter");
  await expect(niche).toHaveValue("Fixture specialist niche");
  for (const theme of ["light", "dark"]) {
    await page
      .getByRole("combobox", { name: "Color theme", exact: true })
      .first()
      .selectOption(theme);
    await niche.fill("plum");
    await expect(
      page.getByRole("option", { name: "Plumber", exact: true }),
    ).toBeVisible();
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      axe.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: `.hallmark/validation/corrections-niche-${theme}-${test.info().project.name}.png`,
      fullPage: true,
    });
  }
});

test("domain form is worldwide, candidate controls stay internal, and discovery layout is ordered", async ({
  page,
}, info) => {
  await page.goto("/domain-buyer-finder");
  for (const name of [
    "Country",
    "State",
    "City",
    "Business niche",
    "Maximum candidates",
  ])
    await expect(page.getByLabel(name, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Matching strategy")).toHaveValue("auto");
  await page.getByLabel("Matching strategy").selectOption("personal");
  await expect(
    page.getByLabel("Professional context", { exact: true }),
  ).toHaveAttribute("required", "");
  await page.getByText("Advanced filters", { exact: true }).click();
  await expect(page.getByLabel("Country code (optional)")).toBeVisible();
  await page.goto("/");
  const links = page.locator(".discovery-grid > a");
  await expect(links).toHaveCount(4);
  const boxes = await Promise.all(
    [0, 1, 2, 3].map((i) => links.nth(i).boundingBox()),
  );
  if (info.project.name === "desktop") {
    expect(boxes[0]!.y).toBe(boxes[1]!.y);
    expect(boxes[2]!.y).toBe(boxes[3]!.y);
    expect(boxes[2]!.x).toBe(boxes[0]!.x);
    expect(boxes[3]!.x).toBe(boxes[1]!.x);
  } else
    for (let i = 1; i < 4; i++)
      expect(boxes[i]!.y).toBeGreaterThan(boxes[i - 1]!.y);
  for (const path of [
    "/business-contacts",
    "/website-opportunities",
    "/new-businesses",
  ]) {
    await page.goto(path);
    await expect(
      page.getByLabel("Maximum candidates", { exact: true }),
    ).toHaveCount(0);
  }
});

test("approved icon is recognizable at app sizes and navigation has an accessible name", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "LeadAtlas home", exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('img[src*="wordmark"]')).toHaveCount(0);
  // Isolated visual inspection sheet made from the actual approved assets.
  await page.evaluate(() => {
    const main = document.querySelector("main")!;
    main.replaceChildren();
    for (const theme of ["light", "dark"]) {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;align-items:center;gap:32px;padding:24px;background:var(--${theme === "dark" ? "navy" : "surface"});`;
      for (const size of [16, 24, 32, 64, 128]) {
        const image = document.createElement("img");
        image.src = "/brand/leadatlas-icon-v2.png";
        image.width = size;
        image.height = size;
        image.alt = `Approved logo ${size}px`;
        image.style.cssText =
          "background:var(--color-logo-paper);border-radius:4px";
        row.append(image);
      }
      main.append(row);
    }
  });
  await page.screenshot({
    path: `.hallmark/validation/approved-logo-sizes-${info.project.name}.png`,
    fullPage: true,
  });
});
