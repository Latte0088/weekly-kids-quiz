# 週末キッズクイズ

小学2年生向けの、週末5分で遊べるクイズです。毎週土曜に新しい回が自動で追加されます。

公開URL: https://latte0088.github.io/weekly-kids-quiz/

## ファイル構成

- `index.html` — トップページ（「7さい」「3さい」「ゲーム」のドアカード）
- `games/index.html` — ゲームの入り口ページ（ゲームのドアカード一覧）
- `games/star-striker/index.html` — STAR STRIKER（宇宙シューティング。単一ファイル、Canvas＋Web Audio。ドラッグ／マウスで移動、タッチ中オートショット、コンボ・パワーアップ・ボス戦、ハイスコアは localStorage 保存）
- 九九ゲート — STAR STRIKER でゲームオーバーになるとロックされ（localStorage `starStrikerKukuLock`）、ゲームオーバー画面とロック中のタイトル画面に「九九にいく」ボタンが出て九九（`kuku/?gate=star-striker`）へ遷移する。九九を10問／20問最後まで解くと（エンドレスは対象外）ロックが解除され、結果画面に「ゲームにもどる」ボタンが出る
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

加えて `tests/security-scan.spec.js` で、公開リポジトリへの機密情報・個人情報の混入を検査します。認証情報パターン（GitHub PAT、秘密鍵、APIキー、パスワード代入など）はリポジトリ全体、連絡先や開発環境の痕跡（メールアドレス、電話番号、郵便番号、ローカルの絶対パス）は公開ページ側ファイルを対象にスキャンし、1件でも見つかればテストが失敗します。検出パターン自体がダミーの秘密情報を捕まえられるかの自己検証も含みます。子どもの名前・学校名のような固有名は、リスト自体を公開できないため対象外で、「個人情報を入れない」運用ルールで担保します。

- ローカル実行: `npm ci` → `npx playwright install chromium` → `npm test`（テスト用サーバーが自動で起動します）
- CI: main への push と Pull Request で GitHub Actions が自動実行します。公開（GitHub Pages へのデプロイ）は従来どおり push で自動反映されます。

## 開発フロー

変更はブランチを作成して行い、CI（Playwrightテスト）が通過してから `main` にマージします（`main` へ直接コミットしません）。
