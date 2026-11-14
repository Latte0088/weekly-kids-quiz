# 週末キッズクイズ

小学2年生向けの、週末5分で遊べるクイズです。毎週土曜に新しい回が自動で追加されます。

公開URL: https://latte0088.github.io/weekly-kids-quiz/

## ファイル構成

- `index.html` — トップの年齢分岐ページ（「7さい」と「3さい」のドアカード）
- `grade2/index.html` — 7歳（小学2年生）向け入り口ページ（「クイズ」と「九九」のドアカード）
- `age3/index.html` — 3歳向けアプリ（単一ファイルSPA：選択ハブ＋おべんとうづくり／どうぶつかくれんぼ／キラキラはなび。外部アセットなし、音はWeb Audio合成）
- `quiz/index.html` — クイズの目次ページ（最新ボタン・あそびかた・回の一覧）
- `assets/style.css` — クイズ側の全ページ共通デザイン
- `assets/quiz.js` — クイズ共通のエンジン
- `quiz/quiz-001.html`、`quiz/quiz-002.html` … — 回ごとのページ（各5問）
- `kuku/index.html` — 九九スピードアタック（九九のタイムアタックゲーム）
