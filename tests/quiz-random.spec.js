const { test, expect } = require("@playwright/test");

test("ランダムモード：全問プールから重ならない5問が出て最後まで遊べる", async ({ page }) => {
  await page.goto("/quiz/random.html");
  const info = await page.evaluate(() => ({
    picked: QUIZ_DATA.length,
    unique: new Set(QUIZ_DATA.map((q) => q.q)).size,
    pool: ALL_QUESTIONS.length,
    allFromPool: QUIZ_DATA.every((q) => ALL_QUESTIONS.some((a) => a.q === q.q)),
  }));
  expect(info.pool).toBeGreaterThanOrEqual(15);
  expect(info.picked).toBe(5);
  expect(info.unique).toBe(5);
  expect(info.allFromPool).toBe(true);

  for (let i = 0; i < 5; i++) {
    await page.evaluate((qi) => {
      const correct = QUIZ_DATA[qi].choices.find((c) => c.ok);
      const probe = document.createElement("div");
      probe.innerHTML = correct.t;
      const target = probe.textContent.trim();
      const btns = document.querySelectorAll("#choices .choice-btn");
      for (const b of btns) {
        if (b.textContent.trim() === target) { b.click(); return; }
      }
      throw new Error("correct choice button not found");
    }, i);
    await expect(page.locator("#correctArea")).toBeVisible();
    await page.click("#nextBtn");
  }
  await expect(page.locator("#view-result")).toBeVisible();
});

test("クイズ目次にランダムボタンがある", async ({ page }) => {
  await page.goto("/quiz/");
  const btn = page.locator("a.random-btn");
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute("href", "random.html");
});
