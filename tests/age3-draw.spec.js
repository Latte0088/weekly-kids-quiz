const { test, expect } = require("@playwright/test");

async function openDraw(page) {
  await page.goto("/age3/");
  await page.click('[data-goto="draw"]');
  await expect(page.locator("#view-draw")).toBeVisible();
  await page.waitForFunction(() => {
    const c = document.getElementById("fxCanvas");
    return c && c.width > 100;
  });
}

test.describe("キラキラ はなび", () => {
  test("ゴミ箱ボタンはなく、バーは色＋スタンプ切替＋うちあげだけ", async ({ page }) => {
    await openDraw(page);
    await expect(page.locator("#trashBtn")).toHaveCount(0);
    await expect(page.locator("#stampToggle")).toBeVisible();
    await expect(page.locator("#launchBtn")).toBeVisible();
    await expect(page.locator("#colorBtns .color-btn")).toHaveCount(5);
  });

  test("スタンプパレットが開き、選ぶと切替ボタンに反映される", async ({ page }) => {
    await openDraw(page);
    await page.click("#stampToggle");
    await expect(page.locator("#stampPop")).toBeVisible();
    await expect(page.locator("#stampBtns .stamp-btn")).toHaveCount(18);
    await page.click('#stampBtns .stamp-btn[aria-label="dino"]');
    await expect(page.locator("#stampPop")).toBeHidden();
    await expect(page.locator("#stampToggle")).toHaveText("🦖");
    // 追加した動物スタンプ（ねこ）も選べる
    await page.click("#stampToggle");
    await page.click('#stampBtns .stamp-btn[aria-label="neko"]');
    await expect(page.locator("#stampPop")).toBeHidden();
    await expect(page.locator("#stampToggle")).toHaveText("🐱");
    // 追加した果物スタンプ（りんご）も選べる
    await page.click("#stampToggle");
    await page.click('#stampBtns .stamp-btn[aria-label="ringo"]');
    await expect(page.locator("#stampPop")).toBeHidden();
    await expect(page.locator("#stampToggle")).toHaveText("🍎");
  });

  test("たくさん描くと変身花火（形の粒）が必ず出る", async ({ page }) => {
    await openDraw(page);
    const box = await page.locator("#fxCanvas").boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx - 260, cy - 160);
    await page.mouse.down();
    for (let i = 0; i <= 24; i++) {
      await page.mouse.move(cx - 260 + i * 22, cy - 160 + (i % 5) * 70, { steps: 2 });
    }
    await page.mouse.up();
    const count = await page.evaluate(() => stampCount);
    expect(count).toBeGreaterThanOrEqual(30);
    await page.click("#launchBtn");
    await expect
      .poll(async () => page.evaluate(() => particles.some((p) => p.shape)), { timeout: 6000 })
      .toBe(true);
  });
});
