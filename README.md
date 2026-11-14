# 週末キッズクイズ

小学2年生向けの、週末5分で遊べるクイズです。毎週土曜に新しい回が自動で追加されます。

公開URL: https://latte0088.github.io/weekly-kids-quiz/

## ファイル構成

- `index.html` — トップの年齢分岐ページ（「7さい」と「3さい」のドアカード）
- `grade2/index.html` — 7歳（小学2年生）向け入り口ページ（「クイズ」と「九九」のドアカード）
- `age3/index.html` — 3歳向けアプリ（単一ファイルSPA：選択ハブ＋おべんとうづくり／どうぶつかくれんぼ／キラキラはなび。外部アセットなし、音はWeb Audio合成）
- `quiz/index.html` — クイズの目次ページ（最新ボタン・ランダムボタン・あそびかた・回の一覧）
- `assets/style.css` — クイズ側の全ページ共通デザイン
- `assets/quiz.js` — クイズ共通のエンジン
- `assets/questions.js` — ランダムモード用の全問プール（`tools/build_questions.py` が各回から自動生成。手で編集しない）
- `quiz/quiz-001.html`、`quiz/quiz-002.html` … — 回ごとのページ（各5問）
- `quiz/random.html` — ランダム5問モード（全問プールから重ならない5問を毎回ランダム出題）
- `kuku/index.html` — 九九スピードアタック（九九のタイムアタックゲーム）
- `tests/` — Playwrightによる自動テスト一式（下記）
- `.github/workflows/tests.yml` — GitHub Actions CI（push / Pull Request で自動テスト）

## テスト

Playwright で実際のブラウザを操作して検証します（おべんとうの高速タップ完食と「もういっかい」後の再プレイ、かくれんぼの星プログレスと乗り物モード、はなびのスタンプパレットと変身花火、九九の○×バッジ位置、クイズ全問正解フロー、ランダムモードの抽選と通しプレイ、ページ遷移）。

- ローカル実行: `npm ci` → `npx playwright install chromium` → `npm test`（テスト用サーバーが自動で起動します）
- CI: main への push と Pull Request で GitHub Actions が自動実行します。公開（GitHub Pages へのデプロイ）は従来どおり push で自動反映されます。

## 開発フロー

変更はブランチを作成して行い、CI（Playwrightテスト）が通過してから `main` にマージします（`main` へ直接コミットしません）。
