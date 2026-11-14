const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

// 公開リポジトリに機密情報・個人情報が混入していないかを検査するスキャン。
// - 認証情報パターン（PAT・秘密鍵・APIキー・パスワード代入など）はリポジトリ全体が対象。
// - 連絡先や開発環境の痕跡パターンは、公開されるサイト側ファイルだけが対象。
// - このスキャナ自身のファイルは、検出パターンの文字列を含むため対象から外す。
// - 子どもの名前・学校名のような固有名は、リスト自体を公開リポジトリに置けないため
//   ここでは扱わない（従来どおり「個人情報を入れない」運用ルールで担保する）。

const ROOT = path.join(__dirname, "..");
const SELF = path.join(__dirname, "security-scan.spec.js");
const SKIP_DIRS = new Set([".git", "node_modules", "test-results", "playwright-report"]);
const SKIP_FILES = new Set(["package-lock.json"]);
const TEXT_EXTS = new Set([".html", ".css", ".js", ".md", ".json", ".yml", ".yaml", ".txt", ".py"]);

// 公開サイト側とみなすパス（この配下だけ連絡先チェックも行う）
const SITE_PREFIXES = ["index.html", "README.md", "grade2/", "age3/", "quiz/", "kuku/", "games/", "assets/"];

function collectFiles(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectFiles(path.join(dir, entry.name), base, out);
    } else if (entry.isFile()) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(base, full).split(path.sep).join("/");
      if (full === SELF || SKIP_FILES.has(entry.name)) continue;
      if (TEXT_EXTS.has(path.extname(entry.name))) out.push({ full, rel });
    }
  }
  return out;
}

const ALL_FILES = collectFiles(ROOT, ROOT, []);
const SITE_FILES = ALL_FILES.filter((f) => SITE_PREFIXES.some((p) => f.rel === p || f.rel.startsWith(p)));

const CREDENTIAL_RULES = [
  ["GitHub fine-grained PAT", /github_pat_[A-Za-z0-9_]{20,}/],
  ["GitHub トークン（ghp_/gho_/ghu_/ghs_/ghr_）", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["秘密鍵ブロック", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS アクセスキー", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google APIキー", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["APIキー（sk- 形式）", /\bsk-[A-Za-z0-9_-]{20,}/],
  ["Slack トークン", /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ["Bearer トークン", /Bearer\s+[A-Za-z0-9._~+/-]{15,}/],
  ["認証情報の代入（password/api_key/secret/token = \"...\"）", /(password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token)\s*[:=]\s*["'][^"'\s]{6,}["']/i],
  ["パスワード（日本語表記）", /パスワード\s*[:：=]\s*\S{4,}/],
];

const SITE_ONLY_RULES = [
  ["メールアドレス", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["電話番号（ハイフン区切り）", /\b0\d{1,4}-\d{1,4}-\d{4}\b/],
  ["携帯電話番号（連続11桁）", /\b0[789]0\d{8}\b/],
  ["郵便番号（〒）", /〒\s?\d{3}-\d{4}/],
  ["ローカル環境の絶対パス", /\/home\/[A-Za-z0-9._-]+\/|\/Users\/[A-Za-z0-9._-]+\/|C:\\Users\\/],
];

function scan(files, rules) {
  const hits = [];
  for (const { full, rel } of files) {
    const text = fs.readFileSync(full, "utf8");
    const lines = text.split("\n");
    for (const [name, re] of rules) {
      lines.forEach((line, i) => {
        if (re.test(line)) hits.push(`${rel}:${i + 1} [${name}]`);
      });
    }
  }
  return hits;
}

test("セキュリティスキャン: リポジトリ全体に認証情報のパターンが含まれていない", () => {
  expect(ALL_FILES.length).toBeGreaterThan(10);
  const hits = scan(ALL_FILES, CREDENTIAL_RULES);
  expect(hits, `認証情報らしき文字列が見つかりました:\n${hits.join("\n")}`).toEqual([]);
});

test("セキュリティスキャン: 公開ページに連絡先・個人情報・開発環境のパターンが含まれていない", () => {
  expect(SITE_FILES.length).toBeGreaterThan(10);
  const hits = scan(SITE_FILES, SITE_ONLY_RULES);
  expect(hits, `公開ページに載せるべきでない文字列が見つかりました:\n${hits.join("\n")}`).toEqual([]);
});

test("セキュリティスキャン: 検出パターン自体がダミーの秘密情報を捕まえられる（自己検証）", () => {
  const dummies = [
    "github_pat_" + "A1b2C3d4E5f6G7h8I9j0K1l2",
    "ghp_" + "x".repeat(36),
    "-----BEGIN RSA PRIVATE KEY-----",
    "AKIA" + "Z9".repeat(8),
    "AIza" + "q".repeat(35),
    "const password = \"hunter2secret\";",
    "Bearer " + "abcDEF123._-".repeat(3),
  ];
  for (const d of dummies) {
    const matched = CREDENTIAL_RULES.some(([, re]) => re.test(d));
    expect(matched, `ダミーを検出できませんでした: ${d.slice(0, 24)}…`).toBe(true);
  }
  const siteDummies = ["連絡は taro.example@example.co.jp まで", "電話 090-1234-5678", "/home/someone/workspace/file.html"];
  for (const d of siteDummies) {
    const matched = SITE_ONLY_RULES.some(([, re]) => re.test(d));
    expect(matched, `ダミーを検出できませんでした: ${d}`).toBe(true);
  }
});
