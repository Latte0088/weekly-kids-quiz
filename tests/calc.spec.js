const { test, expect } = require("@playwright/test");

async function tapDigits(page, numStr) {
  for (const d of String(numStr)) {
    await page.locator("#tenkey button").filter({ hasText: new RegExp("^" + d + "$") }).click();
  }
}

async function readQuestion(page) {
  const a = Number(await page.locator("#qA").textContent());
  const b = Number(await page.locator("#qB").textContent());
  const op = (await page.locator("#qOp").textContent()).trim();
  return { a, b, op, ans: op === "＋" ? a + b : a - b };
}

test.describe("たしざん・ひきざんスピードアタック", () => {
  test("1けた たしざん: 山札方式で a が 9問ごとに 1〜9 を一巡する", async ({ page }) => {
    await page.goto("/calc/");
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    const as = [];
    for (let i = 0; i < 10; i++) {
      const q = await readQuestion(page);
      expect(q.op).toBe("＋");
      expect(q.a).toBeGreaterThanOrEqual(1);
      expect(q.a).toBeLessThanOrEqual(9);
      expect(q.b).toBeGreaterThanOrEqual(1);
      expect(q.b).toBeLessThanOrEqual(9);
      as.push(q.a);
      await tapDigits(page, q.ans);
      await page.waitForTimeout(120);
    }
    await expect(page.locator("#view-result")).toBeVisible();
    expect([...as.slice(0, 9)].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let i = 1; i < as.length; i++) expect(as[i]).not.toBe(as[i - 1]);
    // ベスト記録が保存される
    const best = await page.evaluate(() => localStorage.getItem("calc-best-plus-1-10"));
    expect(best).not.toBeNull();
  });

  test("1けた ひきざん: 答えは 0以上で、全問解くとクリアになる", async ({ page }) => {
    await page.goto("/calc/");
    await page.locator("#opGrid .pick-btn").filter({ hasText: /ひきざん/ }).click();
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    for (let i = 0; i < 10; i++) {
      const q = await readQuestion(page);
      expect(q.op).toBe("−");
      expect(q.a).toBeGreaterThanOrEqual(q.b);
      expect(q.ans).toBeGreaterThanOrEqual(0);
      await tapDigits(page, q.ans);
      await page.waitForTimeout(120);
    }
    await expect(page.locator("#view-result")).toBeVisible();
    const best = await page.evaluate(() => localStorage.getItem("calc-best-minus-1-10"));
    expect(best).not.toBeNull();
  });

  test("2けた ミックス: 両方の符号が出て、数は 10〜99、ひきざんは答えが 0以上", async ({ page }) => {
    await page.goto("/calc/");
    await page.locator("#opGrid .pick-btn").filter({ hasText: /ミックス/ }).click();
    await page.locator("#digitsRow .pick-btn").filter({ hasText: /2けた/ }).click();
    await page.locator("#countRow .pick-btn").filter({ hasText: /20もん/ }).click();
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    const ops = new Set();
    for (let i = 0; i < 20; i++) {
      const q = await readQuestion(page);
      ops.add(q.op);
      expect(q.a).toBeGreaterThanOrEqual(10);
      expect(q.a).toBeLessThanOrEqual(99);
      expect(q.b).toBeGreaterThanOrEqual(10);
      expect(q.b).toBeLessThanOrEqual(99);
      if (q.op === "−") expect(q.a).toBeGreaterThanOrEqual(q.b);
      expect(q.ans).toBeGreaterThanOrEqual(0);
      await tapDigits(page, q.ans);
      await page.waitForTimeout(120);
    }
    await expect(page.locator("#view-result")).toBeVisible();
    expect(ops.has("＋")).toBeTruthy();
    expect(ops.has("−")).toBeTruthy();
    const best = await page.evaluate(() => localStorage.getItem("calc-best-mix-2-20"));
    expect(best).not.toBeNull();
  });
});
