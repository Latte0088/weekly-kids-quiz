#!/usr/bin/env python3
"""quiz/quiz-*.html の QUIZ_DATA を集めて assets/questions.js（ALL_QUESTIONS）を生成する。

ランダム5問モード（quiz/random.html）が使う全問プール。
新しい回を追加したら、このスクリプトを実行して assets/questions.js を更新すること。
"""
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def extract_array(html: str) -> str:
    """var QUIZ_DATA = [ ... ]; の配列リテラルを、文字列内を考慮して括弧マッチで取り出す。"""
    marker = "var QUIZ_DATA = "
    start = html.index(marker) + len(marker)
    open_idx = html.index("[", start)
    depth = 0
    in_str = False
    esc = False
    for i in range(open_idx, len(html)):
        ch = html[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return html[open_idx : i + 1]
    raise ValueError("QUIZ_DATA array not terminated")


def main() -> int:
    files = sorted(glob.glob(os.path.join(ROOT, "quiz", "quiz-*.html")))
    if not files:
        print("no quiz files found", file=sys.stderr)
        return 1
    chunks = []
    total = 0
    for path in files:
        with open(path, encoding="utf-8") as f:
            html = f.read()
        arr = extract_array(html)
        inner = arr[1:-1].strip()
        count = inner.count('"cat":') or inner.count("cat:")
        chunks.append("  /* " + os.path.basename(path) + " */\n" + inner)
        total += count
        print(os.path.basename(path), "->", count, "questions")
    body = ",\n".join(chunks)
    out = (
        "// このファイルは tools/build_questions.py が自動生成します。手で編集しないでください。\n"
        "// ランダム5問モード（quiz/random.html）用の全問プール。\n"
        "var ALL_QUESTIONS = [\n" + body + "\n];\n"
    )
    dest = os.path.join(ROOT, "assets", "questions.js")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(out)
    print("wrote", dest, "total", total, "questions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
