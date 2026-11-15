const { test, expect } = require("@playwright/test");

// 九九の「おすすめ」ボタンと「記録クリア」ボタンの検証。
// おすすめ = 記録が無い組み合わせ（段×10もん）を優先し、
// 全部に記録がある場合は1問あたりのベストタイムが最遅の組み合わせ。
// 20もんはおすすめの候補に入らない（自分で選んだときだけ遊ぶ）。

function seedBests(page, overrides, skip) {
  return page.addInitScript(
    ([ov, sk]) => {
      for (let d = 0; d <= 9; d++) {
        for (const c of [10, 20]) {
          const key = `kuku-best-${d}-${c}`;
          if (sk.includes(key)) continue;
          localStorage.setItem(key, ov[key] || "20.0");
        }
      }
    },
    [overrides, skip]
  );
}

test("おすすめ: 記録が無いときは1のだん・10もんを勧めて、押すと始まる", async ({ page }) => {
  await page.goto("/kuku/");
  await expect(page.locator("#osusumeBtn")).toContainText("1のだん");
  await expect(page.locator("#osusumeBtn")).toContainText("10もん");
  await page.click("#osusumeBtn");
  await expect(page.locator("#view-game")).toBeVisible();
  await expect(page.locator("#qDan")).toHaveText("1のだん");
  await expect(page.locator("#statQ")).toHaveText("1 / 10");
});

test("おすすめ: 記録が無い組み合わせが残っていればそれを勧める", async ({ page }) => {
  await seedBests(page, {}, ["kuku-best-5-10"]);
  await page.goto("/kuku/");
  await expect(page.locator("#osusumeBtn")).toContainText("5のだん");
  await page.click("#osusumeBtn");
  await expect(page.locator("#qDan")).toHaveText("5のだん");
});

test("おすすめ: 全部に記録があるときは1問あたり最遅の組み合わせを勧める", async ({ page }) => {
  // 3のだん・10もん = 50秒（5.0秒/問）が最遅。7のだん・20もん = 90秒（4.5秒/問）は
  // 合計では長いが1問あたりでは速いので、選ばれないことを確認する。
  await seedBests(page, { "kuku-best-3-10": "50.0", "kuku-best-7-20": "90.0" }, []);
  await page.goto("/kuku/");
  await expect(page.locator("#osusumeBtn")).toContainText("3のだん");
  await expect(page.locator("#osusumeBtn")).toContainText("10もん");
  await page.click("#osusumeBtn");
  await expect(page.locator("#qDan")).toHaveText("3のだん");
  await expect(page.locator("#statQ")).toHaveText("1 / 10");
});

test("おすすめ: 20もんは候補に入らない（未記録の20もんや最遅の20もんがあっても10もんを勧める）", async ({ page }) => {
  // 10もんは全部に記録あり。最遅は 2のだん・10もん = 40秒（4.0秒/問）。
  // 20もん側には「未記録（9のだん・0のだん）」と「1問あたり最遅の 5のだん・20もん = 200秒」を
  // 用意しても、おすすめは 10もんから選ばれることを確認する。
  await seedBests(
    page,
    { "kuku-best-2-10": "40.0", "kuku-best-5-20": "200.0" },
    ["kuku-best-9-20", "kuku-best-0-20"]
  );
  await page.goto("/kuku/");
  await expect(page.locator("#osusumeBtn")).toContainText("2のだん");
  await expect(page.locator("#osusumeBtn")).toContainText("10もん");
  await expect(page.locator("#osusumeBtn")).not.toContainText("20もん");
  await page.click("#osusumeBtn");
  await expect(page.locator("#qDan")).toHaveText("2のだん");
  await expect(page.locator("#statQ")).toHaveText("1 / 10");
});

test("記録クリア: いいえでは消えず、はいで全ベスト記録だけが消える", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kuku-best-0-10", "33.3");
    localStorage.setItem("kuku-best-4-20", "80.0");
    localStorage.setItem("starStrikerBest", "500");
  });
  await page.goto("/kuku/");
  const kukuKeys = () =>
    page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("kuku-best-")).length);
  expect(await kukuKeys()).toBe(2);

  // いいえ → 消えない
  await page.click("#clearRecordsBtn");
  await expect(page.locator("#clearConfirm")).toBeVisible();
  await page.click("#clearNoBtn");
  await expect(page.locator("#clearConfirm")).toBeHidden();
  expect(await kukuKeys()).toBe(2);

  // はい → 九九の記録だけ消える（STAR STRIKERの記録は残る）
  await page.click("#clearRecordsBtn");
  await page.click("#clearYesBtn");
  await expect(page.locator("#clearDone")).toBeVisible();
  expect(await kukuKeys()).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("starStrikerBest"))).toBe("500");
  // 記録が無くなったので、おすすめは先頭に戻る
  await expect(page.locator("#osusumeBtn")).toContainText("1のだん");
});
