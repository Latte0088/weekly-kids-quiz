const { test, expect } = require("@playwright/test");

// ポヨンランは横画面前提なので、この spec では横長ビューポートを使う
test.use({ viewport: { width: 1280, height: 720 } });

// ポヨンラン（オートラン横スクロール）の検証。
// タップでジャンプ／2段ジャンプ、ハート制と救済、ギミック各種、
// ゴールでクリア、ゲームオーバーから九九チャレンジ（runner）への遷移。

async function startGame(page) {
  await page.goto("/games/runner/");
  await page.click("#startBtn");
  await page.waitForFunction(() => gameState === "PLAYING");
}

test.describe("ポヨンラン", () => {
  test("タイトルからスタートでき、自動で右へ走る", async ({ page }) => {
    await page.goto("/games/runner/");
    await expect(page.locator("#titleScreen")).toBeVisible();
    await expect(page.locator("#startBtn")).toContainText("スタート");
    await page.click("#startBtn");
    await page.waitForFunction(() => gameState === "PLAYING");
    const x1 = await page.evaluate(() => player.x);
    await page.waitForTimeout(500);
    const x2 = await page.evaluate(() => player.x);
    expect(x2).toBeGreaterThan(x1 + 80);
    expect(await page.evaluate(() => hearts)).toBe(3);
  });

  test("練習ゾーン（序盤）は穴も敵もない", async ({ page }) => {
    await page.goto("/games/runner/");
    const ok = await page.evaluate(() => {
      const firstGap = grounds[0].x + grounds[0].w;
      const enemyMin = Math.min(
        ...walkerDefs.map((d) => d.x),
        ...spikerDefs.map((d) => d.x)
      );
      return firstGap >= 1900 && enemyMin >= 1900;
    });
    expect(ok).toBeTruthy();
  });

  test("タップでジャンプ、空中でもう1回で2段ジャンプ（3回目は出ない）", async ({ page }) => {
    await startGame(page);
    await page.locator("#gameCanvas").click({ position: { x: 400, y: 300 } });
    await page.waitForFunction(() => jumpsUsed === 1 && player.vy < 0);
    await page.waitForTimeout(120);
    await page.locator("#gameCanvas").click({ position: { x: 400, y: 300 } });
    await page.waitForFunction(() => jumpsUsed === 2);
    const vyAfterDouble = await page.evaluate(() => player.vy);
    expect(vyAfterDouble).toBeLessThan(0);
    await page.locator("#gameCanvas").click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => jumpsUsed)).toBe(2);
    // 着地するとリセットされる
    await page.waitForFunction(() => player.grounded === true, null, { timeout: 4000 });
    expect(await page.evaluate(() => jumpsUsed)).toBe(0);
  });

  test("コインを取ると数が増える", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { player.x = 430; });
    await page.waitForFunction(() => coinCount >= 3, null, { timeout: 4000 });
  });

  test("バネで大ジャンプする", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { player.x = 3350; player.y = GROUND_Y - 26; player.vy = 0; });
    await expect
      .poll(() => page.evaluate(() => player.y), { timeout: 4000 })
      .toBeLessThan(170);
  });

  test("ダッシュ床を踏むとダッシュ状態になる", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { player.x = 4900; player.y = GROUND_Y - 26; player.vy = 0; });
    await page.waitForFunction(() => dashTime > 0, null, { timeout: 3000 });
  });

  test("消える雲は乗ってから1.5秒ほどで消える", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.x = 5700; player.y = 280; player.vy = 100;
    });
    await page.waitForFunction(() => player.grounded && Math.abs(player.y + 26 - 350) < 3, null, { timeout: 3000 });
    await page.waitForFunction(() => clouds[0].state === "gone", null, { timeout: 3500 });
  });

  test("歩く敵に横から当たるとハートが減って無敵時間になる。トゲ敵は上からでもダメージ", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      const e = walkers[0];
      player.x = e.x; player.y = GROUND_Y - 26; player.vy = 0;
    });
    await page.waitForFunction(() => hearts === 2 && invincibleTime > 0, null, { timeout: 3000 });
    // 無敵が切れたあと、トゲ敵の真上から落ちてもダメージ
    await page.evaluate(() => {
      invincibleTime = 0;
      player.x = spikers[0].x; player.y = 300; player.vy = 500;
    });
    await page.waitForFunction(() => hearts === 1, null, { timeout: 3000 });
  });

  test("歩く敵は上から踏むと倒せて跳ねる", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      const e = walkers[1];
      player.x = e.x; player.y = GROUND_Y - 120; player.vy = 500;
    });
    await page.waitForFunction(() => walkers[1].alive === false, null, { timeout: 3000 });
    expect(await page.evaluate(() => hearts)).toBe(3);
  });

  test("穴に落ちるとハートが減って安全な足場から復帰する", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { player.x = 2465; player.y = 560; player.vy = 300; });
    await page.waitForFunction(() => hearts === 2, null, { timeout: 3000 });
    const pos = await page.evaluate(() => ({ x: player.x, y: player.y }));
    expect(pos.x).toBeLessThan(2465);
    expect(pos.y).toBeLessThan(300);
  });

  test("ゴールに着くとクリア画面（コインと星）が出る", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { player.x = GOAL_X - 60; });
    await page.waitForFunction(() => gameState === "CLEAR", null, { timeout: 3000 });
    await expect(page.locator("#clearScreen")).toBeVisible({ timeout: 4000 });
    await expect(page.locator("#clearCoins")).toContainText("コイン ×");
    await expect(page.locator("#clearStars")).toContainText("☆");
  });

  test("ゲームオーバーから九九チャレンジ（runner）へ行き、クリアすると runner のパワーアップが貯まる", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { hearts = 1; invincibleTime = 0; takeDamage(); });
    await page.waitForFunction(() => gameState === "GAMEOVER");
    await expect(page.locator("#overScreen")).toBeVisible();
    await page.click("#toKukuBtn");
    await expect(page).toHaveURL(/\/kuku\/\?challenge=runner&t=\d+$/);
    await expect(page.locator("#challengeBanner")).toBeVisible();
    await page.click("#startBtn");
    // チャレンジは じゅんばん（1のだん ×1, ×2, ...）
    for (let i = 0; i < 10; i++) {
      const a = parseInt(await page.locator("#qA").textContent(), 10);
      const b = parseInt(await page.locator("#qB").textContent(), 10);
      expect(b).toBe(i % 9 + 1);
      for (const d of String(a * b)) {
        await page.click(`#tenkey button[data-digit="${d}"]`);
      }
      await page.waitForTimeout(150);
    }
    await expect(page.locator("#challengeResult")).toBeVisible();
    const stored = await page.evaluate(() => ({
      runner: localStorage.getItem("runnerPowerUp"),
      striker: localStorage.getItem("starStrikerPowerUp"),
      href: document.getElementById("toGameChallengeBtn").getAttribute("href"),
    }));
    expect(stored.runner).toBe("1");
    expect(stored.striker).toBeNull();
    expect(stored.href).toContain("games/runner/");
  });

  test("パワーアップがあるとタイトルに表示され、スタートでハート4つになり消費される", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("runnerPowerUp", "1"));
    await page.goto("/games/runner/");
    await expect(page.locator("#powerReadyNote")).toBeVisible();
    await page.click("#startBtn");
    await page.waitForFunction(() => gameState === "PLAYING");
    const st = await page.evaluate(() => ({
      hearts, maxHearts, flag: localStorage.getItem("runnerPowerUp"),
    }));
    expect(st.hearts).toBe(4);
    expect(st.maxHearts).toBe(4);
    expect(st.flag).toBeNull();
  });

  test("全画面ボタンで画面いっぱいに広がる", async ({ page }) => {
    await page.goto("/games/runner/");
    await expect(page.locator("#fsBtn")).toBeVisible();
    // キャンバスはステージの幅いっぱい（左右に余白なし）
    const fill = await page.evaluate(() => {
      const c = document.getElementById("gameCanvas");
      const s = document.getElementById("stage");
      return Math.abs(c.clientWidth - s.clientWidth) <= 1 && Math.abs(c.clientHeight - s.clientHeight) <= 1;
    });
    expect(fill).toBe(true);
    await page.click("#fsBtn");
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 });
    // 全画面ではサイトバーが消えてステージが高くなる
    const fsStageH = await page.evaluate(() => document.getElementById("stage").clientHeight);
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
    const normalStageH = await page.evaluate(() => document.getElementById("stage").clientHeight);
    expect(fsStageH).toBeGreaterThan(normalStageH);
  });

  test("ゲームハブに2つのゲームが並ぶ", async ({ page }) => {
    await page.goto("/games/");
    await expect(page.locator('a.quiz-card[href="star-striker/"]')).toHaveCount(1);
    await expect(page.locator('a.quiz-card[href="runner/"]')).toHaveCount(1);
  });
});
