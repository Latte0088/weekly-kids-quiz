// STAR STRIKER × 九九チャレンジの連動テスト（ご褒美方式）
// - ゲームオーバーではロックされず、2つの選択肢が出る
// - 「そのまま もういちど」で即再開できる（逃げ道）
// - 「九九チャレンジ」で10問解くとパワーアップがチャージされ、次の1ランで消費される
// - 難易度スケーリング（ボス撃破ごとに敵が強く・多く・アイテム増）
const { test, expect } = require("@playwright/test");

async function canvasClick(page, fx, fy) {
  const box = await page.locator("#gameCanvas").boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

async function toGameOver(page) {
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");
  await page.evaluate(() => damagePlayer());
  await page.waitForFunction(() => gameState === "GAMEOVER");
}

// 九九の現在の式にテンキーで答える（1問分）
async function answerOne(page) {
  const a = parseInt(await page.locator("#qA").textContent(), 10);
  const b = parseInt(await page.locator("#qB").textContent(), 10);
  for (const d of String(a * b)) {
    await page.click(`#tenkey button[data-digit="${d}"]`);
  }
  await page.waitForTimeout(150);
}

test("ゲームオーバー: ロックされず、そのまま もういちど で即再開できる", async ({ page }) => {
  await toGameOver(page);
  // 旧ゲートのロック記録は作られない
  expect(await page.evaluate(() => localStorage.getItem("starStrikerKukuLock"))).toBe(null);
  // Bボタン（そのまま もういちど あそぶ、中心 y=505/640）で即プレイ再開
  await canvasClick(page, 0.5, 505 / 640);
  await page.waitForFunction(() => gameState === "PLAYING");
});

test("九九チャレンジ: 10問クリアでパワーアップがチャージされ、1ランだけ消費される", async ({ page }) => {
  await toGameOver(page);
  // Aボタン（九九チャレンジ、中心 y=429/640）で九九チャレンジへ
  await canvasClick(page, 0.5, 429 / 640);
  await expect(page).toHaveURL(/\/kuku\/\?challenge=star-striker$/);

  // チャレンジ画面: バナーと説明が出て、選択UIは隠れ、タイマーは無い
  await expect(page.locator("#challengeBanner")).toBeVisible();
  await expect(page.locator("#challengeBanner")).toContainText("パワーアップ ちょうせん");
  await expect(page.locator("#danGrid")).toBeHidden();
  await expect(page.locator("#countRow")).toBeHidden();
  await expect(page.locator("#startBtn")).toContainText("ちょうせん スタート");

  await page.click("#startBtn");
  await expect(page.locator("#view-game")).toBeVisible();
  await expect(page.locator("#statTimeBox")).toBeHidden();
  await expect(page.locator("#chargeRow")).toBeVisible();
  await expect(page.locator("#qDan")).toHaveText("1のだん");
  await expect(page.locator("#statQ")).toHaveText("1 / 10");

  // 1問正解でチャージが1つ貯まる（チャージは全10個）
  await answerOne(page);
  await expect(page.locator(".charge-bolt.lit")).toHaveCount(1);
  await expect(page.locator(".charge-bolt")).toHaveCount(10);
  await expect(page.locator("#chargeLabel")).toHaveText("パワーチャージ中！");

  // 残り9問を解くとチャレンジ結果画面になる
  for (let i = 0; i < 9; i++) await answerOne(page);
  await expect(page.locator("#view-result")).toBeVisible();
  await expect(page.locator("#challengeResult")).toBeVisible();
  await expect(page.locator("#normalResult")).toBeHidden();
  await expect(page.locator("#challengeRewardText")).toContainText("チャージしたよ");
  // パワーアップフラグが貯まり、通常のベスト記録は作られていない
  expect(await page.evaluate(() => localStorage.getItem("starStrikerPowerUp"))).toBe("1");
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("kuku-best-")))).toEqual([]);

  // ゲームに戻る（この時点ではフラグはまだ消費されていない）
  await page.click("#toGameChallengeBtn");
  await expect(page).toHaveURL(/\/games\/star-striker\/$/);
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  expect(await page.evaluate(() => localStorage.getItem("starStrikerPowerUp"))).toBe("1");

  // 開始した瞬間にフラグが消費され、シールド＋無敵つきのパワーアップランになる
  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");
  expect(await page.evaluate(() => runPowered)).toBe(true);
  expect(await page.evaluate(() => player.hasShield)).toBe(true);
  expect(await page.evaluate(() => player.invincibleTimer)).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem("starStrikerPowerUp"))).toBe(null);

  // パワーアップ中は3WAY（vx=-1.8の斜め弾が出る）
  const box = await page.locator("#gameCanvas").boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.waitForFunction(() => bullets.some(b => Math.abs(b.vx + 1.8) < 0.01), null, { timeout: 4000 });
  await page.mouse.up();

  // ゲームオーバー: パワーアップ終了メッセージの条件（runPowered）が立っている
  await page.evaluate(() => damagePlayer()); // シールドで1回防がれる
  await page.evaluate(() => { player.invincibleTimer = 0; damagePlayer(); });
  await page.waitForFunction(() => gameState === "GAMEOVER");
  expect(await page.evaluate(() => runPowered)).toBe(true);

  // Bボタンで再開すると通常ランに戻る（フラグは消費済み）
  await canvasClick(page, 0.5, 505 / 640);
  await page.waitForFunction(() => gameState === "PLAYING");
  expect(await page.evaluate(() => runPowered)).toBe(false);
  expect(await page.evaluate(() => player.hasShield)).toBe(false);
});

test("チャージ済みフラグ: タイトルでは消費されず、開始で消費される", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("starStrikerPowerUp", "1"));
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  expect(await page.evaluate(() => localStorage.getItem("starStrikerPowerUp"))).toBe("1");
  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");
  expect(await page.evaluate(() => runPowered)).toBe(true);
  expect(await page.evaluate(() => player.hasShield)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("starStrikerPowerUp"))).toBe(null);
});

test("[P]アイテム: 基礎パターンを1段階引き上げる（通常→3WAY / パワーアップ中→5WAY）", async ({ page }) => {
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");
  expect(await page.evaluate(() => runPowered)).toBe(false);

  const box = await page.locator("#gameCanvas").boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.65);
  await page.mouse.down();

  // 通常ラン＋[P]: 3WAY（vx=-1.8 が出て、5WAYの外側弾は出ない）
  await page.evaluate(() => { player.powerTimer = 480; });
  await page.waitForFunction(() => bullets.some(b => Math.abs(b.vx + 1.8) < 0.01), null, { timeout: 4000 });
  expect(await page.evaluate(() => bullets.some(b => b.vx <= -3.5))).toBe(false);

  // パワーアップ中＋[P]: 5WAY（一番外側の弾 vx=-3.6 が出る）
  await page.evaluate(() => { runPowered = true; player.powerTimer = 480; bullets = []; });
  await page.waitForFunction(() => bullets.some(b => b.vx <= -3.5), null, { timeout: 4000 });
  await page.mouse.up();
});

test("難易度スケーリング: ボス撃破数で敵HP・出現間隔・ドロップ率が変わる", async ({ page }) => {
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  const base = await page.evaluate(() => ({
    heavyHp: enemyHpFor("heavy"),
    spinnerHp: enemyHpFor("spinner"),
    interval: spawnIntervalFrames(),
    lightDrop: dropChanceFor("light"),
    speed: enemySpeedScale(),
  }));
  expect(base.heavyHp).toBe(4);
  expect(base.spinnerHp).toBe(2);
  expect(base.lightDrop).toBeCloseTo(0.1);
  expect(base.speed).toBe(1);

  const leveled = await page.evaluate(() => {
    bossLevel = 4;
    return {
      heavyHp: enemyHpFor("heavy"),
      spinnerHp: enemyHpFor("spinner"),
      interval: spawnIntervalFrames(),
      lightDrop: dropChanceFor("light"),
      speed: enemySpeedScale(),
    };
  });
  expect(leveled.heavyHp).toBe(6); // 4 + floor(4/2)
  expect(leveled.spinnerHp).toBe(3); // 2 + floor(4/3)
  expect(leveled.interval).toBeLessThan(base.interval);
  expect(leveled.lightDrop).toBeCloseTo(0.18);
  expect(leveled.speed).toBeGreaterThan(1);
});

test("通常の九九は従来どおり（タイマーあり・チャージなし）", async ({ page }) => {
  await page.goto("/kuku/");
  await expect(page.locator("#challengeBanner")).toBeHidden();
  await expect(page.locator("#danGrid")).toBeVisible();
  await page.click("#startBtn");
  await expect(page.locator("#view-game")).toBeVisible();
  await expect(page.locator("#statTimeBox")).toBeVisible();
  await expect(page.locator("#chargeRow")).toBeHidden();
  await expect(page.locator("#statQ")).toHaveText("1 / 10");
});
