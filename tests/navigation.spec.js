const { test, expect } = require("@playwright/test");

test("トップの年齢分岐から両方の入り口へ進める", async ({ page }) => {
  await page.goto("/");
  await page.click('a[href="grade2/"]');
  await expect(page).toHaveURL(/\/grade2\/$/);
  // 7歳側：クイズと九九のドア
  await page.click('a[href="../quiz/"]');
  await expect(page).toHaveURL(/\/quiz\/$/);
  await page.goto("/grade2/");
  await page.click('a[href="../kuku/"]');
  await expect(page).toHaveURL(/\/kuku\/$/);
  await page.goto("/grade2/");
  await page.click('a[href="../calc/"]');
  await expect(page).toHaveURL(/\/calc\/$/);
  // 3歳側
  await page.goto("/");
  await page.click('a[href="age3/"]');
  await expect(page).toHaveURL(/\/age3\/$/);
  await expect(page.locator('[data-goto="bento"]')).toBeVisible();
  await expect(page.locator('[data-goto="animal"]')).toBeVisible();
  await expect(page.locator('[data-goto="draw"]')).toBeVisible();
});
