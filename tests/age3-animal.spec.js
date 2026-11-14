const { test, expect } = require("@playwright/test");

async function openAnimal(page) {
  await page.goto("/age3/");
  await page.click('[data-goto="animal"]');
  await expect(page.locator("#view-animal")).toBeVisible();
}

async function answerCorrect(page) {
  const correctName = await page.evaluate(() => curAnimal.name);
  await page.locator(".choice-card", { hasText: correctName }).click();
}

test.describe("どうぶつ かくれんぼ", () => {
  test("星プログレスが10個表示される", async ({ page }) => {
    await openAnimal(page);
    await expect(page.locator("#progressDots .pstar")).toHaveCount(10);
  });

  test("正解すると星が1つ埋まる", async ({ page }) => {
    await openAnimal(page);
    await answerCorrect(page);
    await expect(page.locator("#progressDots .pstar.filled")).toHaveCount(1);
  });

  test("のりものモード：車庫シーンと乗り物の選択肢になり、正解で星が埋まる", async ({ page }) => {
    await openAnimal(page);
    await page.click("#modeVehicleBtn");
    await expect(page.locator("#view-animal")).toHaveClass(/veh-mode/);
    const names = await page.locator(".choice-card .ch-name").allTextContents();
    const vehicles = ["しんかんせん", "しょうぼうしゃ", "パトカー", "ショベルカー"];
    expect(names.length).toBe(3);
    for (const n of names) expect(vehicles).toContain(n.trim());
    await answerCorrect(page);
    await expect(page.locator("#progressDots .pstar.filled")).toHaveCount(1);
    // どうぶつモードに戻れる
    await page.click("#modeAnimalBtn");
    await expect(page.locator("#view-animal")).not.toHaveClass(/veh-mode/);
  });
});
