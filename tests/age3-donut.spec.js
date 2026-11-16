const { test, expect } = require("@playwright/test");

async function openDonut(page) {
  await page.goto("/age3/");
  await page.click('[data-goto="donut"]');
  await expect(page.locator("#view-donut")).toBeVisible();
}

async function targetOf(page) {
  return Number(await page.locator("#donutTargetNum").textContent());
}

/* 目標が1だと乗せた瞬間に完成してロックされるため、戻す操作のテストは2以上の問題で始める */
async function openDonutAtLeast(page, min) {
  await openDonut(page);
  while ((await targetOf(page)) < min) {
    await page.click("#view-donut [data-home]");
    await page.click('[data-goto="donut"]');
    await expect(page.locator("#view-donut")).toBeVisible();
  }
}

test.describe("ドーナツ かぞえよう", () => {
  test("ハブに4つ目のカードがあり、問題の数だけ乗せると完成する", async ({ page }) => {
    await page.goto("/age3/");
    await expect(page.locator(".hub-card")).toHaveCount(4);
    await page.click('[data-goto="donut"]');
    await expect(page.locator("#view-donut")).toBeVisible();
    const target = await targetOf(page);
    expect(target).toBeGreaterThanOrEqual(1);
    expect(target).toBeLessThanOrEqual(5);
    await expect(page.locator("#donutSlots .donut-slot")).toHaveCount(target);
    const src = page.locator("#donutSource .donut-btn");
    await expect(src).toHaveCount(5);
    for (let i = 0; i < target; i++) await src.nth(i).click();
    await expect(page.locator("#donutSlots .donut-slot.filled")).toHaveCount(target);
    await expect(page.locator("#donutCountNum")).toHaveText(String(target));
    await expect(page.locator("#donutCelebrate")).toBeVisible();
    await expect(page.locator("#donutDoneText")).toContainText(String(target) + "こ");
  });

  test("乗せたドーナツには1から順に番号がつく", async ({ page }) => {
    await openDonut(page);
    const target = await targetOf(page);
    test.skip(target < 2, "番号の並びは2個以上の問題で確認する");
    const src = page.locator("#donutSource .donut-btn");
    await src.nth(0).click();
    await src.nth(1).click();
    const badges = page.locator("#donutSlots .donut-num");
    await expect(badges).toHaveCount(2);
    await expect(badges.nth(0)).toHaveText("1");
    await expect(badges.nth(1)).toHaveText("2");
  });

  test("トレーのドーナツをタップすると戻せる", async ({ page }) => {
    await openDonutAtLeast(page, 2);
    const src = page.locator("#donutSource .donut-btn");
    await src.nth(0).click();
    await expect(page.locator("#donutCountNum")).toHaveText("1");
    await expect(src.nth(0)).toHaveClass(/used/);
    await page.locator("#donutSlots .donut-slot.filled").first().click();
    await expect(page.locator("#donutCountNum")).toHaveText("0");
    await expect(page.locator("#donutSlots .donut-slot.filled")).toHaveCount(0);
    await expect(src.nth(0)).not.toHaveClass(/used/);
  });

  async function dragCenterToCenter(page, from, to) {
    const fb = await from.boundingBox();
    const tb = await to.boundingBox();
    await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 14 });
    await page.mouse.up();
  }

  test("ドラッグしてトレーに乗せられる", async ({ page }) => {
    await openDonut(page);
    const src = page.locator("#donutSource .donut-btn").first();
    const slot = page.locator("#donutSlots .donut-slot").first();
    await dragCenterToCenter(page, src, slot);
    await expect(page.locator("#donutCountNum")).toHaveText("1");
    await expect(page.locator("#donutSlots .donut-slot.filled")).toHaveCount(1);
    await expect(src).toHaveClass(/used/);
  });

  test("ドラッグで全部乗せると完成する（トレーの上なら空きマスに入る）", async ({ page }) => {
    await openDonut(page);
    const target = await targetOf(page);
    const tray = page.locator(".donut-tray");
    for (let i = 0; i < target; i++) {
      await dragCenterToCenter(page, page.locator("#donutSource .donut-btn").nth(i), tray);
    }
    await expect(page.locator("#donutSlots .donut-slot.filled")).toHaveCount(target);
    await expect(page.locator("#donutCelebrate")).toBeVisible();
  });

  test("トレーのドーナツを外へドラッグすると戻る", async ({ page }) => {
    await openDonutAtLeast(page, 2);
    const src = page.locator("#donutSource .donut-btn").first();
    await src.click();
    await expect(page.locator("#donutCountNum")).toHaveText("1");
    const filled = page.locator("#donutSlots .donut-slot.filled").first();
    await dragCenterToCenter(page, filled, page.locator(".donut-ask"));
    await expect(page.locator("#donutCountNum")).toHaveText("0");
    await expect(page.locator("#donutSlots .donut-slot.filled")).toHaveCount(0);
    await expect(src).not.toHaveClass(/used/);
  });

  test("「つぎの もんだい」で違う数の問題になる", async ({ page }) => {
    await openDonut(page);
    const target = await targetOf(page);
    const src = page.locator("#donutSource .donut-btn");
    for (let i = 0; i < target; i++) await src.nth(i).click();
    await expect(page.locator("#donutCelebrate")).toBeVisible();
    await page.click("#donutNextBtn");
    await expect(page.locator("#donutCelebrate")).toBeHidden();
    await expect(page.locator("#donutCountNum")).toHaveText("0");
    await expect(page.locator("#donutSlots .donut-slot.filled")).toHaveCount(0);
    const next = await targetOf(page);
    expect(next).not.toBe(target);
  });
});
