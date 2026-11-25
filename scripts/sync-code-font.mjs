/**
 * 把 @mogeko/maple-mono-cn 的 CSS 与字体分片同步到 public/fonts/maple-mono/。
 *
 * 为什么要绕开 npm 包直接 import：
 *   该包导出的 result.css 有 239 条 @font-face（unicode-range 分片）。一旦在组件里
 *   `import` 它，CSS 就会进入 Astro 打包产物；而本站的文章页是 catch-all 路由
 *   （src/pages/[...slug].astro），Astro 会把 catch-all 的 CSS 注入到**所有**页面，
 *   于是首页、归档页、分类页都白下 250 KB 代码块字体声明。
 *   改成 public 静态文件 + 只在文章页 <link> 引入，首页彻底不加载。
 *
 * 分片总体积约 9 MB，只影响仓库体积，dist 体积不变（原本同样要打进去）。
 * 依赖升级后重跑：node scripts/sync-code-font.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "node_modules/@mogeko/maple-mono-cn/dist/font");
const OUT = path.join(ROOT, "public/fonts/maple-mono");

if (!fs.existsSync(SRC)) {
	console.error(`找不到字体包：${SRC}，请先 pnpm install`);
	process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const css = fs.readFileSync(path.join(SRC, "result.css"), "utf8");
fs.writeFileSync(
	path.join(OUT, "maple-mono.css"),
	`/* 由 scripts/sync-code-font.mjs 从 @mogeko/maple-mono-cn 复制，勿手改 */\n${css}`,
);

let copied = 0;
let bytes = 0;
for (const name of fs.readdirSync(SRC)) {
	if (!name.endsWith(".woff2")) continue;
	const buf = fs.readFileSync(path.join(SRC, name));
	fs.writeFileSync(path.join(OUT, name), buf);
	copied++;
	bytes += buf.length;
}

console.log(`[sync-code-font] ${copied} 个分片，${(bytes / 1048576).toFixed(1)} MB -> public/fonts/maple-mono/`);
