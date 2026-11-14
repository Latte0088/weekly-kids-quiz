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

  test("全モード（3種×2けた・10もん）のベスト記録が保存され、一覧に出る", async ({ page }) => {
    const combos = [
      { opText: /たしざん/, dgText: /1けた/, key: "calc-best-plus-1-10" },
      { opText: /ひきざん/, dgText: /1けた/, key: "calc-best-minus-1-10" },
      { opText: /ミックス/, dgText: /1けた/, key: "calc-best-mix-1-10" },
      { opText: /たしざん/, dgText: /2けた/, key: "calc-best-plus-2-10" },
      { opText: /ひきざん/, dgText: /2けた/, key: "calc-best-minus-2-10" },
      { opText: /ミックス/, dgText: /2けた/, key: "calc-best-mix-2-10" },
    ];
    await page.goto("/calc/");
    for (const c of combos) {
      await page.locator("#opGrid .pick-btn").filter({ hasText: c.opText }).click();
      await page.locator("#digitsRow .pick-btn").filter({ hasText: c.dgText }).click();
      await page.click("#startBtn");
      await expect(page.locator("#view-game")).toBeVisible();
      for (let i = 0; i < 10; i++) {
        const q = await readQuestion(page);
        await tapDigits(page, q.ans);
        await page.waitForTimeout(50);
      }
      await expect(page.locator("#view-result")).toBeVisible();
      const v = await page.evaluate((k) => localStorage.getItem(k), c.key);
      expect(v, c.key).not.toBeNull();
      await page.click("#reselectBtn");
      await expect(page.locator("#view-start")).toBeVisible();
    }
    // 記録一覧に6モード分すべて表示される
    await expect(page.locator("#recordsList .record-row")).toHaveCount(6);
    await expect(page.locator("#recordsList")).toContainText("ひきざん・2けた・10もん");
  });

  test("二桁ひきざんの記録はリロード後も残り、ラベルと一覧に表示される", async ({ page }) => {
    await page.goto("/calc/");
    await page.locator("#opGrid .pick-btn").filter({ hasText: /ひきざん/ }).click();
    await page.locator("#digitsRow .pick-btn").filter({ hasText: /2けた/ }).click();
    await page.click("#startBtn");
    for (let i = 0; i < 10; i++) {
      const q = await readQuestion(page);
      await tapDigits(page, q.ans);
      await page.waitForTimeout(50);
    }
    await expect(page.locator("#view-result")).toBeVisible();
    await page.reload();
    await page.locator("#opGrid .pick-btn").filter({ hasText: /ひきざん/ }).click();
    await page.locator("#digitsRow .pick-btn").filter({ hasText: /2けた/ }).click();
    await expect(page.locator("#bestLabel")).not.toContainText("--.-");
    await expect(page.locator("#recordsList")).toContainText("ひきざん・2けた・10もん");
  });

  test("まちがえると同じ問題が残り、入力と連続記録がリセットされる", async ({ page }) => {
    await page.goto("/calc/");
    await page.click("#startBtn");
    const q1 = await readQuestion(page);
    await tapDigits(page, q1.ans);
    await page.waitForTimeout(80);
    await expect(page.locator("#statStreak")).toHaveText("1");
    const q2 = await readQuestion(page);
    // 桁数が変わらない範囲でわざと間違える
    const wrong = q2.ans >= 10 && q2.ans % 10 !== 9 ? q2.ans + 1 : q2.ans === 9 ? 8 : q2.ans + 1;
    await tapDigits(page, wrong);
    const fx = page.locator("#judgeFx");
    await expect(fx).toHaveClass(/show-ng/);
    // 同じ問題のまま、答え欄は ? に戻り、連続記録は 0
    const q2b = await readQuestion(page);
    expect(q2b.a).toBe(q2.a);
    expect(q2b.b).toBe(q2.b);
    await expect(page.locator("#qAns")).toHaveText("?");
    await expect(page.locator("#statStreak")).toHaveText("0");
    // 正しく入れ直せば進める
    await tapDigits(page, q2.ans);
    await page.waitForTimeout(80);
    await expect(page.locator("#statStreak")).toHaveText("1");
  });

  test("エンドレスは10問を超えても続き、ベスト記録は残らない", async ({ page }) => {
    await page.goto("/calc/");
    await page.locator("#countRow .pick-btn").filter({ hasText: /エンドレス/ }).click();
    await expect(page.locator("#bestLabel")).toHaveText("エンドレスモード");
    await page.click("#startBtn");
    for (let i = 0; i < 12; i++) {
      const q = await readQuestion(page);
      await tapDigits(page, q.ans);
      await page.waitForTimeout(50);
    }
    await expect(page.locator("#view-game")).toBeVisible();
    await expect(page.locator("#statQ")).toContainText("もんめ");
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.filter((k) => k.startsWith("calc-best-"))).toEqual([]);
  });

  test("記録クリアは calc の記録だけを消し、九九の記録は消えない", async ({ page }) => {
    await page.goto("/calc/");
    await page.evaluate(() => localStorage.setItem("kuku-best-1-10", "12.3"));
    await page.click("#startBtn");
    for (let i = 0; i < 10; i++) {
      const q = await readQuestion(page);
      await tapDigits(page, q.ans);
      await page.waitForTimeout(50);
    }
    await expect(page.locator("#view-result")).toBeVisible();
    await page.click("#backBtnResult");
    await expect(page.locator("#recordsList .record-row")).toHaveCount(1);
    await page.click("#clearRecordsBtn");
    await page.click("#clearYesBtn");
    await expect(page.locator("#clearDone")).toBeVisible();
    const state = await page.evaluate(() => ({
      calc: Object.keys(localStorage).filter((k) => k.startsWith("calc-best-")),
      kuku: localStorage.getItem("kuku-best-1-10"),
    }));
    expect(state.calc).toEqual([]);
    expect(state.kuku).toBe("12.3");
    await expect(page.locator("#recordsList")).toContainText("まだ きろくが ないよ");
  });
});
