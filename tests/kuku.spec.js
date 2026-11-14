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
});
