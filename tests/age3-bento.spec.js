const { test, expect } = require("@playwright/test");

async function openBento(page) {
  await page.goto("/age3/");
  await page.click('[data-goto="bento"]');
  await expect(page.locator("#view-bento")).toBeVisible();
}

async function fillCells(page, foodIndexes) {
  const tray = page.locator("#foodTray .food-btn");
  for (const i of foodIndexes) await tray.nth(i).click();
}

/* 実機の連打を再現：詰まっている全マスへ pointerdown を一斉に発火 */
async function eatAllRapid(page) {
  await page.evaluate(() => {
    document.querySelectorAll("#bentoGrid .bento-cell.filled").forEach((cell) => {
      cell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
  });
}

test.describe("おべんとうづくり", () => {
  test("おかずが10種あり、4個以上で完成できる", async ({ page }) => {
    await openBento(page);
    await expect(page.locator("#foodTray .food-btn")).toHaveCount(10);
    await fillCells(page, [0, 6, 8, 9]); // おにぎり・からあげ・いちご・バナナ
    await expect(page.locator("#bentoGrid .bento-cell.filled")).toHaveCount(4);
    await expect(page.locator("#doneBtn")).toBeEnabled();
  });

  test("プレート切替で新幹線プレートになる", async ({ page }) => {
    await openBento(page);
    await page.click("#plateBtn");
    await expect(page.locator("#bentoBox")).toHaveClass(/train/);
    await expect(page.locator("#plateBadge")).toBeVisible();
    await page.click("#plateBtn");
    await expect(page.locator("#bentoBox")).not.toHaveClass(/train/);
  });

  test("あーん：高速タップでも全部食べ切れて完了する", async ({ page }) => {
    await openBento(page);
    await fillCells(page, [0, 1, 2, 3, 4, 5]);
    await page.click("#doneBtn");
    await expect(page.locator("#eatBanner")).toBeVisible();
    await eatAllRapid(page);
    await expect(page.locator("#celebrate")).toBeVisible();
    await expect(page.locator("#moguText")).toContainText("ごちそうさま");
  });

  test("スマホ画面（375×667）でも「できた！」が画面内にあり押せる", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openBento(page);
    await fillCells(page, [0, 1, 2, 3]);
    const box = await page.locator("#doneBtn").boundingBox();
    expect(box).not.toBeNull();
    expect(box.y + box.height).toBeLessThanOrEqual(667);
    await page.click("#doneBtn");
    await expect(page.locator("#eatBanner")).toBeVisible();
    await eatAllRapid(page);
    await expect(page.locator("#celebrate")).toBeVisible();
  });

  test("あーん：もういっかい後の2回目も完了する（リプレイ回帰）", async ({ page }) => {
    await openBento(page);
    await fillCells(page, [0, 1, 2, 3]);
    await page.click("#doneBtn");
    await eatAllRapid(page);
    await expect(page.locator("#celebrate")).toBeVisible();
    await page.click("#againBtn");
    await expect(page.locator("#celebrate")).toBeHidden();
    // 2回目
    await fillCells(page, [4, 5, 6, 7]);
    await page.click("#doneBtn");
    await eatAllRapid(page);
    await expect(page.locator("#celebrate")).toBeVisible();
    await expect(page.locator("#moguText")).toContainText("ごちそうさま");
  });
});
