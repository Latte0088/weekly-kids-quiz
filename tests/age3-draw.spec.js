const { test, expect } = require("@playwright/test");

async function openDraw(page) {
  await page.goto("/age3/");
  await page.click('[data-goto="draw"]');
  await expect(page.locator("#view-draw")).toBeVisible();
  await page.waitForFunction(() => {
    const c = document.getElementById("fxCanvas");
    return c && c.width > 100;
  });
}

test.describe("キラキラ はなび", () => {
  test("ゴミ箱ボタンはなく、バーは色＋スタンプ切替＋うちあげだけ", async ({ page }) => {
    await openDraw(page);
    await expect(page.locator("#trashBtn")).toHaveCount(0);
    await expect(page.locator("#stampToggle")).toBeVisible();
    await expect(page.locator("#launchBtn")).toBeVisible();
    await expect(page.locator("#colorBtns .color-btn")).toHaveCount(5);
  });

  test("スタンプパレットが開き、選ぶと切替ボタンに反映される", async ({ page }) => {
    await openDraw(page);
    await page.click("#stampToggle");
    await expect(page.locator("#stampPop")).toBeVisible();
    await expect(page.locator("#stampBtns .stamp-btn")).toHaveCount(18);
    await page.click('#stampBtns .stamp-btn[aria-label="dino"]');
    await expect(page.locator("#stampPop")).toBeHidden();
    await expect(page.locator("#stampToggle")).toHaveText("🦖");
    // 追加した動物スタンプ（ねこ）も選べる
    await page.click("#stampToggle");
    await page.click('#stampBtns .stamp-btn[aria-label="neko"]');
    await expect(page.locator("#stampPop")).toBeHidden();
    await expect(page.locator("#stampToggle")).toHaveText("🐱");
    // 追加した果物スタンプ（りんご）も選べる
    await page.click("#stampToggle");
    await page.click('#stampBtns .stamp-btn[aria-label="ringo"]');
    await expect(page.locator("#stampPop")).toBeHidden();
    await expect(page.locator("#stampToggle")).toHaveText("🍎");
  });

  test("バナナスタンプは三日月型（中央下が実で、中央上は空き、右上にヘタの濃色点）", async ({ page }) => {
    await openDraw(page);
    const shape = await page.evaluate(() => {
      const pts = stampPoints("banana");
      const xs = pts.map((p) => p[0]);
      return {
        n: pts.length,
        width: Math.max(...xs) - Math.min(...xs),
        // 中央下（実の部分）に点がある
        midBottom: pts.some((p) => Math.abs(p[0]) < 0.2 && p[1] > 0.1 && p[1] < 0.4),
        // 中央上（内側のへこみ）は空いている
        midTopEmpty: !pts.some((p) => Math.abs(p[0]) < 0.2 && p[1] < -0.25),
        // 右上にヘタ由来の濃色点（花火では白ドットになる）がある
        stemDark: pts.some((p) => p[2] === 1 && p[0] > 0.55 && p[1] < -0.3),
      };
    });
    expect(shape.n).toBeGreaterThan(20);
    expect(shape.width).toBeGreaterThan(1.6);
    expect(shape.midBottom).toBeTruthy();
    expect(shape.midTopEmpty).toBeTruthy();
    expect(shape.stemDark).toBeTruthy();
  });

  test("貼ったスタンプが変身花火になる（パンダを貼るとパンダ色の形の粒が出る）", async ({ page }) => {
    await openDraw(page);
    // スタンプのドット化が十分な点数を持つ
    const pts = await page.evaluate(() => stampPoints("panda").length);
    expect(pts).toBeGreaterThan(100);
    await page.click("#stampToggle");
    await page.click('#stampBtns .stamp-btn[aria-label="panda"]');
    const box = await page.locator("#fxCanvas").boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    for (let i = 0; i < 30; i++) {
      await page.mouse.click(cx - 120 + (i % 6) * 48, cy - 80 + Math.floor(i / 6) * 40);
    }
    await expect.poll(() => page.evaluate(() => stampCount)).toBeGreaterThanOrEqual(30);
    await page.click("#launchBtn");
    // 既定色（あか #ff5252）は従来の変身花火4種にはない色なので、
    // この色の形の粒が出たら「貼ったスタンプの花火」と断定できる
    await expect
      .poll(async () => page.evaluate(() => particles.some((p) => p.shape && p.color === "#ff5252")), { timeout: 6000 })
      .toBe(true);
  });

  test("たくさん描くと変身花火（形の粒）が必ず出る", async ({ page }) => {
    await openDraw(page);
    const box = await page.locator("#fxCanvas").boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx - 260, cy - 160);
    await page.mouse.down();
    for (let i = 0; i <= 24; i++) {
      await page.mouse.move(cx - 260 + i * 22, cy - 160 + (i % 5) * 70, { steps: 2 });
    }
    await page.mouse.up();
    const count = await page.evaluate(() => stampCount);
    expect(count).toBeGreaterThanOrEqual(30);
    await page.click("#launchBtn");
    await expect
      .poll(async () => page.evaluate(() => particles.some((p) => p.shape)), { timeout: 6000 })
      .toBe(true);
  });
});
