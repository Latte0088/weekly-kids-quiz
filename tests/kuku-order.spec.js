const { test, expect } = require("@playwright/test");

// 九九の出題モード（ランダム／じゅんばん）の検証。
// じゅんばん（昇順）: 段が固定なら ×1→×9 を繰り返し、ミックスなら
// 1×1〜1×9、2×1〜2×9…と進む。記録はモード別キー（kuku-best-jun-*）に分かれ、
// おすすめの判定は両モードの記録を見る。ゲームからの挑戦は じゅんばん固定。

async function tapDigits(page, numStr) {
  for (const d of String(numStr)) {
    await page.locator("#tenkey button").filter({ hasText: new RegExp("^" + d + "$") }).click();
  }
}

async function answerCurrent(page) {
  const a = Number(await page.locator("#qA").textContent());
  const b = Number(await page.locator("#qB").textContent());
  await tapDigits(page, a * b);
  await page.waitForTimeout(150);
  return [a, b];
}

test.describe("九九の出題モード", () => {
  test("じゅんばん・固定段: 2×1〜2×9 の順に出て、10問目は 2×1 に戻る。記録は jun キーに入る", async ({ page }) => {
    await page.goto("/kuku/");
    await page.locator("#danGrid .pick-btn").filter({ hasText: /^2のだん$/ }).click();
    await page.click('#orderRow .pick-btn[data-order="jun"]');
    await expect(page.locator("#orderNote")).toContainText("2×1、2×2、2×3");
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    const pairs = [];
    for (let i = 0; i < 10; i++) pairs.push(await answerCurrent(page));
    expect(pairs).toEqual([
      [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 1],
    ]);
    await expect(page.locator("#view-result")).toBeVisible();
    const keys = await page.evaluate(() => ({
      jun: localStorage.getItem("kuku-best-jun-2-10"),
      rnd: localStorage.getItem("kuku-best-2-10"),
    }));
    expect(keys.jun).not.toBeNull();
    expect(keys.rnd).toBeNull();
  });

  test("じゅんばん・ミックス: 1×1〜1×9、2×1 の順に出る", async ({ page }) => {
    await page.goto("/kuku/");
    await page.click('#orderRow .pick-btn[data-order="jun"]');
    await page.click("#startBtn");
    const pairs = [];
    for (let i = 0; i < 10; i++) pairs.push(await answerCurrent(page));
    expect(pairs).toEqual([
      [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [2, 1],
    ]);
    await expect(page.locator("#view-result")).toBeVisible();
  });

  test("ベスト表示はモードごとに切り替わる", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kuku-best-jun-3-10", "25.5");
    });
    await page.goto("/kuku/");
    await page.locator("#danGrid .pick-btn").filter({ hasText: /^3のだん$/ }).click();
    // 既定のランダムでは記録なし
    await expect(page.locator("#bestLabel")).toContainText("--.-");
    // じゅんばんに切り替えると jun の記録が見える
    await page.click('#orderRow .pick-btn[data-order="jun"]');
    await expect(page.locator("#bestLabel")).toContainText("25.5");
    // ランダムに戻すと再び記録なし
    await page.click('#orderRow .pick-btn[data-order="random"]');
    await expect(page.locator("#bestLabel")).toContainText("--.-");
  });

  test("おすすめ判定は じゅんばん の記録も「れんしゅう済み」とみなす", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kuku-best-jun-1-10", "18.0");
    });
    await page.goto("/kuku/");
    await expect(page.locator("#osusumeBtn")).toContainText("2のだん");
  });

  test("チャレンジ中に もどる→やっぱり スタート しても じゅんばん のまま", async ({ page }) => {
    await page.goto("/kuku/?challenge=star-striker&t=12345");
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    // 途中で「もどる」を押してスタート画面に戻る
    await page.click("#backBtn");
    await expect(page.locator("#view-start")).toBeVisible();
    // やっぱり九九（ちょうせん スタート）を押す
    await page.click("#startBtn");
    const pairs = [];
    for (let i = 0; i < 3; i++) pairs.push(await answerCurrent(page));
    expect(pairs).toEqual([[1, 1], [1, 2], [1, 3]]);
    expect(await page.evaluate(() => order)).toBe("jun");
  });

  test("ゲームからの挑戦は じゅんばん で出題され、記録は jun キーに入り、おすすめが次へ進む", async ({ page }) => {
    await page.goto("/kuku/?challenge=star-striker");
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    const pairs = [];
    for (let i = 0; i < 10; i++) pairs.push(await answerCurrent(page));
    expect(pairs.slice(0, 3)).toEqual([[1, 1], [1, 2], [1, 3]]);
    expect(pairs).toEqual([
      [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 1],
    ]);
    await expect(page.locator("#challengeResult")).toBeVisible();
    const stored = await page.evaluate(() => ({
      flag: localStorage.getItem("starStrikerPowerUp"),
      jun: localStorage.getItem("kuku-best-jun-1-10"),
      rnd: localStorage.getItem("kuku-best-1-10"),
    }));
    expect(stored.flag).toBe("1");
    expect(stored.jun).not.toBeNull();
    expect(stored.rnd).toBeNull();
    // 通常画面のおすすめは 2のだん に進んでいる
    await page.goto("/kuku/");
    await expect(page.locator("#osusumeBtn")).toContainText("2のだん");
  });
});
