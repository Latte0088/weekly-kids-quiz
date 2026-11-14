const { test, expect } = require("@playwright/test");

async function tapDigits(page, numStr) {
  for (const d of String(numStr)) {
    await page.locator("#tenkey button").filter({ hasText: new RegExp("^" + d + "$") }).click();
  }
}

test.describe("九九スピードアタック", () => {
  test("○×バッジがテンキーの中央に出る", async ({ page }) => {
    await page.goto("/kuku/");
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    const a = Number(await page.locator("#qA").textContent());
    const b = Number(await page.locator("#qB").textContent());
    const ans = a * b;
    // 不正解：桁数が変わらないよう、答えが9のときだけ8、それ以外は+1
    const wrong = ans === 9 ? 8 : ans + 1;
    await tapDigits(page, wrong);
    const fx = page.locator("#judgeFx");
    await expect(fx).toHaveClass(/show-ng/);
    await expect(fx).toHaveText("×");
    // バッジの中心がテンキーの範囲内にあること
    const fxBox = await fx.boundingBox();
    const tkBox = await page.locator("#tenkey").boundingBox();
    const cx = fxBox.x + fxBox.width / 2, cy = fxBox.y + fxBox.height / 2;
    expect(cx).toBeGreaterThan(tkBox.x);
    expect(cx).toBeLessThan(tkBox.x + tkBox.width);
    expect(cy).toBeGreaterThan(tkBox.y);
    expect(cy).toBeLessThan(tkBox.y + tkBox.height);
    // 正解すると○が出て次へ進む
    await tapDigits(page, ans);
    await expect(fx).toHaveClass(/show-ok/);
    await expect(fx).toHaveText("○");
  });

  test("出題はシャッフル山札: 10問で1〜9が満遍なく出て、連続で同じ数字にならない", async ({ page }) => {
    await page.goto("/kuku/");
    await page.locator("#danGrid .pick-btn").filter({ hasText: /^7のだん$/ }).click();
    await page.click("#startBtn");
    await expect(page.locator("#view-game")).toBeVisible();
    const bs = [];
    for (let i = 0; i < 10; i++) {
      const a = Number(await page.locator("#qA").textContent());
      const b = Number(await page.locator("#qB").textContent());
      expect(a).toBe(7);
      bs.push(b);
      await tapDigits(page, a * b);
      await page.waitForTimeout(150);
    }
    await expect(page.locator("#view-result")).toBeVisible();
    // 最初の9問で1〜9がちょうど1回ずつ出る
    expect([...bs.slice(0, 9)].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // 連続で同じ数字は出ない（山札の継ぎ目も含む）
    for (let i = 1; i < bs.length; i++) expect(bs[i]).not.toBe(bs[i - 1]);
  });
});
