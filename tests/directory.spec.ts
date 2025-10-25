import { expect, test } from "@playwright/test";

const DRIPPING_SLUG = "dripping-springs-songwriters-festival";

test.describe("Directory interactions", () => {
  test("supports searching, filtering, and calendar exploration", async ({ page }) => {
    page.on("console", (msg) => console.log(`[directory:${msg.type()}] ${msg.text()}`));
    await page.goto("/");
    await expect(page).toHaveURL(/\/events\/$/);

    const listCards = page.locator("#list-view .card");
    await expect(listCards.first()).toBeVisible();

    const initialCount = await listCards.count();
    expect(initialCount).toBeGreaterThan(2);

    const searchField = page.getByLabel("Search festivals");
    await searchField.fill("Dripping");

    await expect(listCards.first()).toContainText(/Dripping Springs Songwriters Festival/i);

    const websiteLink = listCards.first().getByRole("link", { name: /Visit website/i });
    const websitePopupPromise = page.waitForEvent("popup");
    await websiteLink.click();
    const websitePopup = await websitePopupPromise;
    await websitePopup.close();

    const showPastToggle = page.locator("#show-past");
    await expect(showPastToggle).not.toBeChecked();
    const upcomingCount = await listCards.count();
    await showPastToggle.check();
    await expect.poll(async () => listCards.count()).toBeGreaterThanOrEqual(upcomingCount);
    await showPastToggle.uncheck();
    await expect.poll(async () => listCards.count()).toBe(upcomingCount);

    await searchField.fill("");
    await page.selectOption("#year-filter", "2026");

    await expect(listCards.first()).toContainText(/2026/i);

    await page.selectOption("#year-filter", "2025");

    await page.click("#calendar-toggle");
    await expect(page.locator("#calendar-view")).toBeVisible();

    const monthSelect = page.locator("#month-select");
    await expect(monthSelect).toBeVisible();

    const firstMonthValue = await monthSelect.locator("option").first().getAttribute("value");
    if (firstMonthValue) {
      await monthSelect.selectOption(firstMonthValue);
    }

    const eventDay = page.locator('.calendar-day[data-has-events="true"]').first();
    await expect(eventDay).toBeVisible();

    const eventButton = eventDay.locator("button");
    await expect(eventButton).toBeVisible();

    await eventDay.scrollIntoViewIfNeeded();
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement) {
        element.click();
      }
    }, '.calendar-day[data-has-events="true"] button');

    const dayDetail = page.locator("#day-detail");
    await expect(dayDetail).toBeVisible();
    await expect(dayDetail.locator("a", { hasText: "Festival detail" }).first()).toHaveAttribute("href", /event\.html#/);

    const aboutLink = page.getByRole("link", { name: "About" });
    await Promise.all([page.waitForLoadState("domcontentloaded"), aboutLink.click()]);
    await expect(page).toHaveURL(/\/about\/$/);

    const directoryLink = page.getByRole("link", { name: "Directory" });
    await Promise.all([page.waitForLoadState("domcontentloaded"), directoryLink.click()]);
    await expect(page).toHaveURL(/\/events\/$/);
  });
});
