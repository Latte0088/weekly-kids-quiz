const { test, expect } = require("@playwright/test");

// STAR STRIKER の九九ゲート: ゲームオーバーでロックされ、
// 「九九にいく」ボタンで九九へ遷移し、九九をクリアするとまた遊べる。

async function canvasClick(page, fx, fy) {
  const box = await page.locator("#gameCanvas").boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

test("ゲート: ゲームオーバー→ボタンで九九へ→クリアで解除→また遊べる", async ({ page }) => {
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");

  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");

  await page.evaluate(() => damagePlayer());
  await page.waitForFunction(() => gameState === "GAMEOVER");
  expect(await page.evaluate(() => localStorage.getItem("starStrikerKukuLock"))).toBe("1");

  // ボタン以外をタップしても再開しない
  await canvasClick(page, 0.5, 0.3);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => gameState)).toBe("GAMEOVER");

  // 「九九にいく」ボタン（キャンバス内部座標の中心 y=451/640）で九九へ遷移
  await canvasClick(page, 0.5, 451 / 640);
  await expect(page).toHaveURL(/\/kuku\/\?gate=star-striker$/);
  await expect(page.locator("#gateBanner")).toBeVisible();

  // 九九を10問クリアする（式を読んでテンキーで答える）
  await page.click("#startBtn");
  for (let i = 0; i < 10; i++) {
    await expect(page.locator("#view-game")).toBeVisible();
    const a = parseInt(await page.locator("#qA").textContent(), 10);
    const b = parseInt(await page.locator("#qB").textContent(), 10);
    for (const d of String(a * b)) {
      await page.click(`#tenkey button[data-digit="${d}"]`);
    }
    await page.waitForTimeout(150);
  }
  await expect(page.locator("#view-result")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("starStrikerKukuLock"))).toBe(null);
  await expect(page.locator("#toGameBtn")).toBeVisible();

  // ゲームへ戻ると、タイトルからまた遊べる
  await page.click("#toGameBtn");
  await expect(page).toHaveURL(/\/games\/star-striker\/$/);
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");
});

test("ゲート: ロック中にタイトルを開いても始まらず、ボタンで九九へ行く", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("starStrikerKukuLock", "1"));
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");

  await canvasClick(page, 0.5, 0.3);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => gameState)).toBe("TITLE");

  // ロック時の九九ボタン（中心 y=415/640）
  await canvasClick(page, 0.5, 415 / 640);
  await expect(page).toHaveURL(/\/kuku\/\?gate=star-striker$/);
});
