const { test, expect } = require("@playwright/test");

test("トップからゲームページを経てSTAR STRIKERへ進める", async ({ page }) => {
  await page.goto("/");
  await page.click('a[href="games/"]');
  await expect(page).toHaveURL(/\/games\/$/);
  await page.click('a[href="star-striker/"]');
  await expect(page).toHaveURL(/\/games\/star-striker\/$/);
  await expect(page.locator("#gameCanvas")).toBeVisible();
  // ゲームページへ戻れる
  await page.click('.site-bar a[href="../"]');
  await expect(page).toHaveURL(/\/games\/$/);
});

test("STAR STRIKER: タイトル→タップで開始し、押し続けると弾が出る", async ({ page }) => {
  await page.goto("/games/star-striker/");
  await expect(page.locator("#gameCanvas")).toBeVisible();
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");

  const box = await page.locator("#gameCanvas").boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.65;

  // タップ（マウスダウン）でゲーム開始
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForFunction(() => gameState === "PLAYING");

  // 押し続けたまま少し待つとオートショットで弾が発射される
  await page.waitForFunction(() => bullets.length > 0, null, { timeout: 5000 });

  // ドラッグで自機が動く
  const before = await page.evaluate(() => ({ x: player.x, y: player.y }));
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5, { steps: 5 });
  const after = await page.evaluate(() => ({ x: player.x, y: player.y }));
  expect(after.x).not.toBe(before.x);
  await page.mouse.up();
});
