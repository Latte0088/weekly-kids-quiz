// STAR STRIKER ボスの形態変化テスト
// - 形態1〜3: 形は同じで色だけ変わる
// - 形態4: 両翼が付き、ウイングキャノンが撃つ
// - 形態5: ツノと回転シールド（見た目）
// - 形態6: サブコア×2（撃って壊せる・各50点）
// - 形態7以降: 大型化
const { test, expect } = require("@playwright/test");

async function canvasClick(page, fx, fy) {
  const box = await page.locator("#gameCanvas").boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

async function startWithBoss(page, form) {
  await page.goto("/games/star-striker/");
  await page.waitForFunction(() => typeof gameState !== "undefined" && gameState === "TITLE");
  await canvasClick(page, 0.5, 0.65);
  await page.waitForFunction(() => gameState === "PLAYING");
  return page.evaluate((f) => {
    player.invincibleTimer = 999999; // テスト中に被弾で終わらないように
    bossLevel = f - 1;
    spawnBoss();
    return {
      form: boss.form,
      subCores: boss.subCores.length,
      r: boss.r,
      body: bossFormStyle(boss.form).body,
    };
  }, form);
}

test("形態1〜3は色だけ変わり、4で両翼、6でサブコア、7で大型化する", async ({ page }) => {
  const snaps = [];
  for (const f of [1, 2, 3, 4, 5, 6, 7]) {
    snaps.push(await startWithBoss(page, f));
  }
  // 形態番号がそのまま付く
  expect(snaps.map((s) => s.form)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  // 1〜3は色がすべて違う（形は同じ＝半径46・サブコアなし）
  expect(new Set(snaps.slice(0, 3).map((s) => s.body)).size).toBe(3);
  for (const s of snaps.slice(0, 6)) {
    expect(s.r).toBe(46);
  }
  // サブコアは形態6から
  expect(snaps[3].subCores).toBe(0);
  expect(snaps[4].subCores).toBe(0);
  expect(snaps[5].subCores).toBe(2);
  expect(snaps[6].subCores).toBe(2);
  // 形態7は大型化
  expect(snaps[6].r).toBeGreaterThan(46);
  // 色は形態ごとに変わる（1〜6すべて異なる）
  expect(new Set(snaps.slice(0, 6).map((s) => s.body)).size).toBe(6);
});

test("ウイングキャノンは形態4から撃ち、形態3では撃たない", async ({ page }) => {
  // 形態4: 翼の位置（本体中心から ±(r+18)）から真下へ2発
  await startWithBoss(page, 4);
  const wingShots = await page.evaluate(async () => {
    boss.vx = 0;
    boss.y = boss.targetY;
    const fireInterval = Math.max(45, 80 - bossLevel * 6);
    boss.attackTimer = fireInterval * 2 - 1; // 次フレームでウイング発射タイミング
    enemyBullets = [];
    await new Promise((r) => setTimeout(r, 250));
    return enemyBullets
      .filter((b) => b.vx === 0 && Math.abs(b.x - boss.x) > 30)
      .map((b) => Math.round(b.x - boss.x));
  });
  expect(wingShots.length).toBe(2);
  expect(wingShots.some((d) => d > 30)).toBeTruthy();
  expect(wingShots.some((d) => d < -30)).toBeTruthy();

  // 形態3: 翼がないので、中心以外から真下への弾は出ない
  await startWithBoss(page, 3);
  const noWing = await page.evaluate(async () => {
    boss.vx = 0;
    boss.y = boss.targetY;
    const fireInterval = Math.max(45, 80 - bossLevel * 6);
    boss.attackTimer = fireInterval * 2 - 1;
    enemyBullets = [];
    await new Promise((r) => setTimeout(r, 250));
    return enemyBullets.filter((b) => b.vx === 0 && Math.abs(b.x - boss.x) > 30).length;
  });
  expect(noWing).toBe(0);
});

test("サブコアは撃って壊せて50点入り、本体はそのまま残る", async ({ page }) => {
  await startWithBoss(page, 6);
  const before = await page.evaluate(() => score);
  const after = await page.evaluate(async () => {
    boss.vx = 0;
    boss.y = boss.targetY;
    const sc = boss.subCores[0];
    bullets.push({ x: boss.x + sc.dx, y: boss.y + sc.y, vx: 0, vy: 0, r: 4, dmg: 99 });
    await new Promise((r) => setTimeout(r, 300));
    return { subCores: boss ? boss.subCores.length : -1, score, bossAlive: Boolean(boss) };
  });
  expect(after.bossAlive).toBeTruthy();
  expect(after.subCores).toBe(1);
  expect(after.score).toBe(before + 50);
});

test("サブコアの発射関数が弾を1発作る", async ({ page }) => {
  await startWithBoss(page, 6);
  const n = await page.evaluate(() => {
    enemyBullets = [];
    fireSubCore(boss, boss.subCores[0], 3);
    return enemyBullets.length;
  });
  expect(n).toBe(1);
});

test("全形態で描画と更新ループがエラーなく回る", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const f of [1, 2, 3, 4, 5, 6, 7, 8]) {
    await startWithBoss(page, f);
    await page.evaluate(() => { boss.y = boss.targetY; });
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => gameState)).toBe("PLAYING");
  }
  expect(errors).toEqual([]);
});
