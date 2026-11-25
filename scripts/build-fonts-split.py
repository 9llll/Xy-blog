"""
生成 Maple UI 的「分片」woff2 字体（按字频切分 + unicode-range 按需加载）。

背景：原来的单文件子集（GB2312 一级 + 站内用字）约 740 KB/字重，两个字重
就是 1.45 MB，首页必须整包下载才不闪字体。

这里改成 Google Fonts 中文字体的标准做法：把字符集按**站内实际字频**切成若干片，
每片一个 woff2，@font-face 用 unicode-range 声明。浏览器只下载「本页真正用到」的片，
通常只命中前 1–2 片（约 100–200 KB），而不是 740 KB 全量。

代价：极生僻字可能落在最后一片，或极少数完全没收录的字回落到系统字体。

用法（需 fonttools + brotli）：
    python -m pip install fonttools brotli
    python scripts/build-fonts-split.py

输出：
    public/fonts/maple-ui/{regular,bold}-{0..N}.woff2
    src/styles/maple-ui.css    ← Layout.astro import 它
"""

import os
import subprocess
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "font-src")
OUT_DIR = os.path.join(ROOT, "public", "fonts", "maple-ui")
CSS_OUT = os.path.join(ROOT, "src", "styles", "maple-ui.css")

TEXT_EXTS = (".md", ".mdx", ".astro", ".ts", ".js", ".mjs", ".json", ".yml", ".yaml", ".html", ".svelte", ".css", ".styl")
SCAN_DIRS = ("src", "public")

# 文件名前缀 → 源 TTF
WEIGHTS = {
    "regular": "maple-ui.ttf",
    "bold": "maple-ui-bold.ttf",
}

# 前面各片放多少个字符（按字频从高到低），剩下的全部进最后一片。
# 高频段放大片（命中率高，单片成本摊得薄），低频段切小片——
# 一页往往只用低频片里的两三个字，切大片等于为这几个字付一整片的钱。
# 实测：900 字一片时首页只用到 2 个字却要下 152 KB。
CHUNK_SIZES = [300, 500, 300, 300, 300]


def collect_freq() -> Counter:
    counter = Counter()
    for rel in SCAN_DIRS:
        for dirpath, _, filenames in os.walk(os.path.join(ROOT, rel)):
            if "node_modules" in dirpath:
                continue
            for name in filenames:
                if not name.endswith(TEXT_EXTS):
                    continue
                try:
                    with open(os.path.join(dirpath, name), encoding="utf-8") as f:
                        counter.update(f.read())
                except (UnicodeDecodeError, OSError):
                    continue
    return counter


def gb2312_level1() -> set:
    chars = set()
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return chars


def to_unicode_range(chars: list) -> str:
    """把字符列表压成最短的 U+xxxx-U+yyyy 形式。"""
    cps = sorted({ord(c) for c in chars})
    parts = []
    start = prev = cps[0]
    for cp in cps[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        parts.append(f"U+{start:X}" if start == prev else f"U+{start:X}-{prev:X}")
        start = prev = cp
    parts.append(f"U+{start:X}" if start == prev else f"U+{start:X}-{prev:X}")
    return ",".join(parts)


def subset(src: str, text_file: str, out: str) -> int:
    cmd = [
        sys.executable,
        "-m",
        "fontTools.subset",
        src,
        f"--text-file={text_file}",
        "--flavor=woff2",
        "--no-hinting",
        "--layout-features=*",
        f"--output-file={out}",
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    return os.path.getsize(out)


def main() -> int:
    counter = collect_freq()

    # 字频序：只保留可打印字符，空白/控制符交给系统字体
    ordered = [c for c, _ in counter.most_common() if ord(c) >= 0x20]
    seen = set(ordered)

    # 站内没出现过的常用字（GB2312 一级）+ ASCII 兜底，保证新文章不至于大面积回落
    tail = [c for c in sorted(gb2312_level1()) if c not in seen]
    tail += [chr(c) for c in range(0x20, 0x7F) if chr(c) not in seen]

    all_chars = ordered + tail
    print(f"字符总数：{len(all_chars)}（站内出现 {len(ordered)}）")

    chunks: list[list[str]] = []
    i = 0
    for n in CHUNK_SIZES:
        chunks.append(all_chars[i : i + n])
        i += n
    chunks.append(all_chars[i:])
    chunks = [c for c in chunks if c]
    print(f"分片数：{len(chunks)}，各片字符数：{[len(c) for c in chunks]}")

    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(ROOT, ".fontchunk.txt")

    css_rules = []
    total = 0
    try:
        for weight, src_name in WEIGHTS.items():
            src = os.path.join(SRC_DIR, src_name)
            if not os.path.exists(src):
                print(f"缺少源文件：{src}", file=sys.stderr)
                return 1
            for idx, chars in enumerate(chunks):
                with open(tmp, "w", encoding="utf-8") as f:
                    f.write("".join(chars))
                out_name = f"{weight}-{idx}.woff2"
                out = os.path.join(OUT_DIR, out_name)
                size = subset(src, tmp, out)
                total += size
                print(f"  {out_name}: {size / 1024:.0f} KB（{len(chars)} 字）")
                css_rules.append(
                    "@font-face{"
                    'font-family:"Maple UI";'
                    f'src:url("/fonts/maple-ui/{out_name}") format("woff2");'
                    f"font-weight:{400 if weight == 'regular' else 700};"
                    "font-style:normal;font-display:swap;"
                    f"unicode-range:{to_unicode_range(chars)};"
                    "}"
                )
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

    header = (
        "/* 由 scripts/build-fonts-split.py 生成，勿手改。\n"
        "   按字频分片 + unicode-range，浏览器只取本页用到的那几片。 */\n"
    )
    with open(CSS_OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(header + "\n".join(css_rules) + "\n")

    print(f"字体合计：{total / 1024:.0f} KB，CSS：{os.path.getsize(CSS_OUT) / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
