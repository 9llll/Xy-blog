"""
生成 Maple UI 的 woff2 子集字体。

背景：font-src/ 下的源文件是全量 TTF（19.6 MB / 14.8 MB）。直接把它们挂到 @font-face
会让浏览器长期加载不出来（font-display: swap 期间一直用系统字体兜底，看起来就是“字体不对”）。
这里按「GB2312 一级常用字 + 本站实际用到的字符」做子集并转成 woff2，体积约 740 KB/字重。

用法（需先安装 fonttools 与 brotli）：
    python -m pip install fonttools brotli
    python scripts/build-fonts.py

重新生成的时机：
    - 换了字体源文件
    - 新增大段含生僻字的内容（子集只含常用字，个别生僻字会回落到系统字体）
"""

import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "font-src")
OUT_DIR = os.path.join(ROOT, "public", "fonts")
TEXT_EXTS = (".md", ".mdx", ".astro", ".ts", ".js", ".mjs", ".json", ".yml", ".yaml", ".html", ".svelte")
SCAN_DIRS = ("src", "public")

WEIGHTS = {
    "maple-ui.ttf": "maple-ui.woff2",
    "maple-ui-bold.ttf": "maple-ui-bold.woff2",
}


def collect_chars() -> str:
    chars = set()
    for rel in SCAN_DIRS:
        for dirpath, _, filenames in os.walk(os.path.join(ROOT, rel)):
            if "node_modules" in dirpath:
                continue
            for name in filenames:
                if not name.endswith(TEXT_EXTS):
                    continue
                try:
                    with open(os.path.join(dirpath, name), encoding="utf-8") as f:
                        chars.update(f.read())
                except (UnicodeDecodeError, OSError):
                    continue

    # GB2312 一级汉字（3755 个常用字），保证以后新增内容不至于大面积回落
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass

    # 保底：ASCII 可见字符
    chars.update(chr(c) for c in range(0x20, 0x7F))
    return "".join(sorted(chars))


def main() -> int:
    text = collect_chars()
    print(f"字符数：{len(text)}")

    tmp = os.path.join(ROOT, ".fontchars.txt")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)

    try:
        for src_name, out_name in WEIGHTS.items():
            src = os.path.join(SRC_DIR, src_name)
            if not os.path.exists(src):
                print(f"缺少源文件：{src}", file=sys.stderr)
                return 1
            out = os.path.join(OUT_DIR, out_name)
            cmd = [
                sys.executable,
                "-m",
                "fontTools.subset",
                src,
                f"--text-file={tmp}",
                "--flavor=woff2",
                "--no-hinting",
                "--layout-features=*",
                f"--output-file={out}",
            ]
            subprocess.run(cmd, check=True)
            size = os.path.getsize(out) / 1024
            print(f"{out_name}: {size:.0f} KB")
    finally:
        os.remove(tmp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
