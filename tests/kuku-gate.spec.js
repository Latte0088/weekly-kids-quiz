const { test, expect } = require("@playwright/test");

// STAR STRIKER の九九ゲート: ゲームオーバーでロックされ、
// 「九九にいく」ボタンで九九へ遷移し、九九をクリアするとまた遊べる。

async function canvasClick(page, fx, fy) {
  const box = await page.locator("#gameCanvas").boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

// 九九の式を読んでテンキーで答え、n問解き切る
async function answerAll(page, n) {
  for (let i = 0; i < n; i++) {
    await expect(page.locator("#view-game")).toBeVisible();
    const a = parseInt(await page.locator("#qA").textContent(), 10);
    const b = parseInt(await page.locator("#qB").textContent(), 10);
    for (const d of String(a * b)) {
      await page.click(`#tenkey button[data-digit="${d}"]`);
    }
    await page.waitForTimeout(150);
  }
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

  // ゲート時はおすすめ（記録なし→1のだん・10もん）が自動選択される。
  // 段・問題数は無効化しない（選び直しは自由。解除されるのはおすすめをクリアした時だけ）
  await expect(page.locator("#danGrid button").first()).toBeEnabled();
  await expect(page.locator("#danMix")).toBeEnabled();

  // 九九を10問クリアする（式を読んでテンキーで答える）
  await page.click("#startBtn");
  await expect(page.locator("#qDan")).toHaveText("1のだん");
  await answerAll(page, 10);
  await expect(page.locator("#view-result")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("starStrikerKukuLock"))).toBe(null);
  // 結果画面にゲームへの近道ボタンは無い（あえて導線を長くする仕様）
  await expect(page.locator("#toGameBtn")).toHaveCount(0);

  // 通常の導線をたどってゲームへ戻る: 九九 → 7さいトップ → トップ → ゲーム → STAR STRIKER
  await page.click("#backBtnResult");
  await page.click('a[href="../grade2/"]');
  await expect(page).toHaveURL(/\/grade2\/$/);
  await page.click('a[href="../index.html"]');
  await expect(page).toHaveURL(/\/index\.html$/);
  await page.click('a[href="games/"]');
  await expect(page).toHaveURL(/\/games\/$/);
  await page.click('a[href="star-striker/"]');
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

test("回帰: ゲームオーバー→九九→戻って通常入場し直すと、おすすめロックは残らない", async ({ page }) => {
  // 報告された再現手順そのもの: ゲームオーバーから九九へ来る
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");
  await page.evaluate(() => damagePlayer());
  await page.waitForFunction(() => gameState === "GAMEOVER");
  await canvasClick(page, 0.5, 451 / 640);
  await expect(page).toHaveURL(/\/kuku\/\?gate=star-striker$/);
  // ゲート入場ではバナーが出ておすすめが自動選択される（ボタンは押せる）
  await expect(page.locator("#danGrid button").first()).toBeEnabled();
  await expect(page.locator("#gateBanner")).toBeVisible();

  // 戻って（7さいトップ経由）通常の入り口から九九に入り直す
  await page.click('a[href="../grade2/"]');
  await expect(page).toHaveURL(/\/grade2\/$/);
  await page.click('a[href="../kuku/"]');
  await expect(page).toHaveURL(/\/kuku\/$/);

  // おすすめロックは残っていない: バナーは出ず、段・問題数を自由に選べる
  await expect(page.locator("#gateBanner")).toBeHidden();
  await expect(page.locator("#danGrid button").first()).toBeEnabled();
  await expect(page.locator("#danMix")).toBeEnabled();
  await expect(page.locator('#countRow button[data-count="20"]')).toBeEnabled();
  // ゲーム側のロック自体は残っている（解除はゲートでおすすめをクリアした時だけ）
  expect(await page.evaluate(() => localStorage.getItem("starStrikerKukuLock"))).toBe("1");
});

test("ゲート外: ロック記録があっても、通常入場のクリアではゲームは解除されない", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("starStrikerKukuLock", "1"));
  await page.goto("/kuku/");
  await expect(page.locator("#gateBanner")).toBeHidden();
  await expect(page.locator("#danGrid button").first()).toBeEnabled();
  await page.click("#startBtn");
  await answerAll(page, 10);
  await expect(page.locator("#view-result")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("starStrikerKukuLock"))).toBe("1");
});

test("回帰: ゲート入場でも段を選び直せて、おすすめ以外のクリアでは解除されない", async ({ page }) => {
  // 報告された再現手順: ゲームオーバー→九九→段を選びなおす
  await page.addInitScript(() => localStorage.setItem("starStrikerKukuLock", "1"));
  await page.goto("/kuku/?gate=star-striker");
  await expect(page.locator("#gateBanner")).toBeVisible();
  // おすすめ（記録なし→1のだん・10もん）が自動選択されている
  await expect(page.locator("#osusumeBtn")).toContainText("1のだん・10もん");
  // 段のボタンは押せて、3のだんに選び直せる（ロックされていない）
  await expect(page.locator("#danGrid button").first()).toBeEnabled();
  await page.locator("#danGrid button").nth(2).click();
  await page.click("#startBtn");
  await expect(page.locator("#qDan")).toHaveText("3のだん");
  // 選び直した組み合わせを最後まで解いても、ゲームは解除されない
  await answerAll(page, 10);
  await expect(page.locator("#view-result")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("starStrikerKukuLock"))).toBe("1");
});
