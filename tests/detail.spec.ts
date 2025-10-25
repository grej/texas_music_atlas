import { expect, test } from "@playwright/test";

const DRIPPING_SLUG = "dripping-springs-songwriters-festival";

test.describe("Festival detail page", () => {
  test("renders slugged festival with multiple instances", async ({ page }) => {
    page.on("console", (msg) => console.log(`[detail:${msg.type()}] ${msg.text()}`));
    await page.goto(`/events/event.html#${DRIPPING_SLUG}`);

    await expect(page.locator("#festival-name")).toHaveText("Dripping Springs Songwriters Festival");
    await expect(page.locator("#festival-dates")).toContainText("2025");
    await expect(page.locator("#festival-location")).toContainText("Dripping Springs");
    await expect(page.getByRole("link", { name: "Official website" })).toHaveAttribute(
      "href",
      "https://www.destinationdrippingsprings.com/p/events/dripping-springs-songwriters-festival"
    );

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Official website" }).click();
    const popup = await popupPromise;
    await popup.close();

    const instanceSelect = page.locator("#instance-select");
    await expect(instanceSelect).toHaveCount(1);

    const options = await instanceSelect.locator("option").allTextContents();
    expect(options.some((text) => text.includes("2025"))).toBeTruthy();
    expect(options.some((text) => text.includes("2026"))).toBeTruthy();

    await instanceSelect.selectOption("1");
    await expect(page.locator("#festival-year")).toHaveText(/2026/);
    await expect(page.locator("#festival-range")).toContainText(/Dates TBD/i);
    await expect(page.locator("#festival-notice")).toBeVisible();
  });
});
