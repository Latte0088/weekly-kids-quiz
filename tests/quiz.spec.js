const { test, expect } = require("@playwright/test");

test("クイズ第1回を全問正解して結果まで進める", async ({ page }) => {
  await page.goto("/quiz/quiz-001.html");
  const total = await page.evaluate(() => QUIZ_DATA.length);
  expect(total).toBe(5);
  for (let i = 0; i < total; i++) {
    // 選択肢は表示時にシャッフルされるため、正解の「文言」でボタンを探して押す
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

test("クイズ目次に公開済みの回が並んでいる", async ({ page }) => {
  await page.goto("/quiz/");
  // 最新ボタンと一覧カードの両方からリンクされるため「存在すること」だけを見る
  await expect(page.locator('a[href="quiz-001.html"]').first()).toBeAttached();
  await expect(page.locator('a[href="quiz-002.html"]').first()).toBeAttached();
});
