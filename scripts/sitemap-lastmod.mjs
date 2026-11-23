/**
 * 给 sitemap 补 lastmod
 *
 * @astrojs/sitemap 默认不输出 <lastmod>。缺了它，搜索引擎无法判断
 * 「这一页是刚更新的还是三年前的」，只能按固定频率来爬，新文章要等。
 *
 * 这里在构建后回填真实日期：
 *   - 文章页 → frontmatter 的 updated（没有则 published）
 *   - 其余页面（首页 / 归档 / 分页 / 关于…）→ 全站最新文章日期
 *
 * 为什么不用构建时间：那样每次构建所有页面 lastmod 都变，
 * 等于告诉蜘蛛「全站每天都改」，可信度归零，反而不如不写。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), process.argv[2] || "dist");
const postsDir = join(process.cwd(), "src/content/posts");

if (!existsSync(dist)) {
	console.error("[sitemap-lastmod] 找不到 dist，跳过");
	process.exit(0);
}
if (!existsSync(postsDir)) {
	console.error("[sitemap-lastmod] 找不到文章目录，跳过");
	process.exit(0);
}

/** 从 frontmatter 里取一个字段的裸值（去掉引号） */
function field(frontmatter, name) {
	const m = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
	return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

/** 归一化成 ISO 日期（只要 YYYY-MM-DD 部分就够 sitemap 用） */
function toDate(value) {
	if (!value) return "";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** slug → 最后修改日期 */
const postDates = new Map();
let siteLatest = "";

for (const file of readdirSync(postsDir).filter((f) => f.endsWith(".md"))) {
	const raw = readFileSync(join(postsDir, file), "utf8");
	const fmBlock = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!fmBlock) continue;
	const fm = fmBlock[1];

	const slug = field(fm, "slug") || file.replace(/\.md$/, "");
	const date = toDate(field(fm, "updated")) || toDate(field(fm, "published"));
	if (!date) continue;

	postDates.set(slug, date);
	if (date > siteLatest) siteLatest = date;
}

if (!siteLatest) {
	console.log("[sitemap-lastmod] 没有可用的文章日期，跳过");
	process.exit(0);
}

const files = readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f));
let patched = 0;

for (const file of files) {
	const path = join(dist, file);
	const xml = readFileSync(path, "utf8");

	const next = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
		if (/<lastmod>/.test(block)) return block; // 已有的不覆盖

		const loc = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
		if (!loc) return block;

		// 路径首段就是 slug（trailingSlash: ignore，两种写法都兜住）
		const pathname = loc.replace(/^https?:\/\/[^/]+/, "").replace(/^\/|\/$/g, "");
		const slug = pathname.split("/")[0];
		const date = postDates.get(slug) || siteLatest;

		patched += 1;
		return block.replace(/<\/loc>/, `</loc><lastmod>${date}</lastmod>`);
	});

	writeFileSync(path, next, "utf8");
}

console.log(`[sitemap-lastmod] 已为 ${patched} 个 URL 补上 lastmod（最新文章 ${siteLatest}）`);
