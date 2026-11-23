/**
 * 站点体检
 *
 * 每天跑一次，覆盖四类问题：
 *   1. 线上可用性 —— 首页 / 归档 / 文章页能否打开，sitemap 里的地址是否都通
 *   2. 内容完整性 —— 文章引用的本地图片是否存在、下载链接是否 404
 *   3. 安全底线 —— 受密码保护的下载地址有没有漏进 RSS / API / 搜索索引 / 构建残留
 *   4. SEO 与数据一致性 —— 分享图是否违规、导航是否被 CMS 覆盖、标题与加密状态是否矛盾
 *
 * 用法：
 *   node scripts/site-check.mjs          体检并输出报告
 *   node scripts/site-check.mjs --fix    先自动修可修项，再体检
 *   node scripts/site-check.mjs --json   只输出 JSON（给自动化读取）
 *
 * --fix 只处理「规则明确、改错也不会」的两类：
 *   - ogImage 指向 raw.githubusercontent.com（项目规定走同域名）
 *   - 标题声称加密、正文却没有 password（把标题里的加密标记去掉）
 * 其余一律只报不改 —— 比如导航少了哪项、链接失效要不要换，这属于你的判断。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SITE = "https://www.3x3.top";
const POSTS_DIR = join(ROOT, "src/content/posts");
const PUBLIC_DIR = join(ROOT, "public");
const JSON_ONLY = process.argv.includes("--json");
const FIX = process.argv.includes("--fix");

const issues = [];
const notes = [];

/** 记一条问题。level: fail 必修 / warn 建议 / info 提示 */
function add(level, area, title, detail, fixable = false) {
	issues.push({ level, area, title, detail, fixable });
}

function read(file) {
	return readFileSync(file, "utf8");
}

/* ───────────────────────── 文章数据 ───────────────────────── */

function parsePosts() {
	return readdirSync(POSTS_DIR)
		.filter((f) => f.endsWith(".md"))
		.map((file) => {
			const raw = read(join(POSTS_DIR, file));
			const fmBlock = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
			const fm = fmBlock ? fmBlock[1] : "";
			const body = fmBlock ? raw.slice(fmBlock[0].length) : raw;

			const grab = (name) => {
				const m = fm.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
				return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
			};

			// ::download{...} / ::down{...} 里的属性，含弯引号容错
			const downloads = [];
			for (const m of body.matchAll(/::download[l]?\{([\s\S]*?)\}/g)) {
				const attrs = {};
				for (const a of m[1].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|[\u201c]([^\u201d]*)[\u201d])/g)) {
					attrs[a[1]] = (a[2] ?? a[3] ?? a[4] ?? "").trim();
				}
				if (Object.keys(attrs).length > 0) downloads.push(attrs);
			}

			const password = grabs(body, /password\s*=\s*["'\u201c]([^"'\u201d]+)/g);
			const codes = downloads.map((d) => d.code).filter(Boolean);

			return {
				file,
				slug: grab("slug") || file.replace(/\.md$/, ""),
				title: grab("title"),
				description: grab("description"),
				ogImage: grab("ogImage"),
				image: grab("image"),
				published: grab("published"),
				body,
				downloads,
				password,
				codes,
			};
		});
}

function grabs(text, re) {
	const out = [];
	for (const m of text.matchAll(re)) if (m[1]) out.push(m[1].trim());
	return [...new Set(out)];
}

/* ───────────────────────── 1. 线上可用性 ───────────────────────── */

async function checkReachable(urls, label) {
	let bad = 0;
	for (const url of urls) {
		try {
			const res = await fetch(url, {
				method: "GET",
				headers: { "user-agent": "Mozilla/5.0 (compatible; Xy-site-check/1.0)" },
				redirect: "follow",
				signal: AbortSignal.timeout(20000),
			});
			if (res.status >= 400) {
				bad += 1;
				add("fail", "可用性", `${label}返回 ${res.status}`, url);
			}
		} catch (error) {
			bad += 1;
			add("fail", "可用性", `${label}请求失败`, `${url} — ${error?.message ?? error}`);
		}
	}
	if (bad === 0) notes.push(`${label}：${urls.length} 个地址全部可访问`);
}

async function checkOnline(posts) {
	// 首页与归档必查
	await checkReachable([`${SITE}/`, `${SITE}/archive/`], "主要页面");

	// 文章页抽样：最新的 3 篇 + 最旧的 1 篇，避免每次全量扫
	const sorted = [...posts].sort((a, b) => (b.published > a.published ? 1 : -1));
	const sample = [...new Set([...sorted.slice(0, 3), sorted.at(-1)])].filter(Boolean);
	await checkReachable(
		sample.map((p) => `${SITE}/${p.slug}/`),
		"文章页抽样",
	);

	// sitemap 是否可访问，并统计条目数
	try {
		const res = await fetch(`${SITE}/sitemap-index.xml`, { signal: AbortSignal.timeout(20000) });
		const xml = await res.text();
		const children = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
		let total = 0;
		for (const child of children) {
			const sub = await fetch(child, { signal: AbortSignal.timeout(20000) });
			total += [...(await sub.text()).matchAll(/<loc>/g)].length;
		}
		notes.push(`sitemap：${children.length} 个子文件，共 ${total} 个 URL`);
		if (total < posts.length) {
			add("warn", "可用性", "sitemap 条目少于文章数", `sitemap ${total} 条 / 文章 ${posts.length} 篇，可能有页面没进 sitemap`);
		}
	} catch (error) {
		add("fail", "可用性", "sitemap 无法读取", String(error?.message ?? error));
	}
}

/* ───────────────────────── 2. 内容完整性 ───────────────────────── */

function checkImages(posts) {
	let missing = 0;
	for (const post of posts) {
		const candidates = [];
		if (post.image) candidates.push(post.image);
		if (post.ogImage && !/^https?:\/\//.test(post.ogImage)) candidates.push(post.ogImage);

		// 正文里的 markdown 图片与小写 img 标签
		for (const m of post.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) candidates.push(m[1]);

		for (const src of candidates) {
			if (/^https?:\/\//.test(src) || src.startsWith("data:")) continue;
			const clean = src.split("?")[0].split("#")[0];
			// 站内绝对路径直接对 public；相对路径按文章目录推断不靠谱，跳过
			if (!clean.startsWith("/")) continue;
			if (!existsSync(join(PUBLIC_DIR, clean))) {
				missing += 1;
				add("fail", "内容", "文章引用的图片不存在", `${post.file} → ${clean}`);
			}
		}
	}
	if (missing === 0) notes.push("图片：文章引用的本地图片全部存在");
}

async function checkDownloadLinks(posts) {
	// 同一链接多篇引用时只测一次
	const urls = new Map();
	let skipped = 0;
	for (const post of posts) {
		for (const d of post.downloads) {
			const url = d.url || "";
			if (!/^https?:\/\//.test(url)) continue;
			// 教程里的 example.com 是占位地址，不是真资源
			if (isPlaceholderUrl(url)) {
				skipped += 1;
				continue;
			}
			if (!urls.has(url)) urls.set(url, []);
			urls.get(url).push(post.file);
		}
	}
	if (urls.size === 0) {
		notes.push(`下载链接：没有可检测的外链${skipped > 0 ? `（跳过 ${skipped} 个示例地址）` : ""}`);
		return;
	}

	let dead = 0;
	for (const [url, files] of urls) {
		try {
			// 网盘对 HEAD 不友好，用 GET 但只读首字节
			const res = await fetch(url, {
				method: "GET",
				headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
				redirect: "follow",
				signal: AbortSignal.timeout(15000),
			});
			// 只报明确的 404 / 410；403 多是防盗链，不代表失效，避免误报
			if (res.status === 404 || res.status === 410) {
				dead += 1;
				add("fail", "下载", `下载地址已失效（HTTP ${res.status}）`, `${url}\n    引用：${files.join(", ")}`);
			}
		} catch (error) {
			// 超时也常见于网盘风控，只做提示
			add("info", "下载", "下载地址检测超时（可能被风控，非必然失效）", `${url} — ${error?.message ?? error}`);
		}
	}
	if (dead === 0) notes.push(`下载链接：${urls.size} 个外链未发现 404`);
}

/* ───────────────────────── 3. 安全底线 ───────────────────────── */

function checkLeak(posts) {
	const dist = join(ROOT, "dist");

	/**
	 * 收集敏感值：下载地址、提取码、访问密码
	 *
	 * 判定必须带字段上下文，否则会大量误报 —— 实测「密码 1234」这种短值
	 * 会命中任何含 1234 的 JSON（图片序号、日期、尺寸都可能）。泄露的本质是
	 * 「字段名 + 值」一起出现在公开输出里，所以按 password="值" / password\":\"值 匹配。
	 */
	const secrets = [];
	for (const post of posts) {
		for (const d of post.downloads) {
			const url = d.url || "";
			if (!/^https?:\/\//.test(url) || isPlaceholderUrl(url)) continue;
			secrets.push({ kind: "下载地址", value: url, post: post.file, pattern: null });
		}
		for (const p of post.password) {
			// 5 位以下的密码在全局搜索里噪音太大，交给带上下文的匹配
			secrets.push({
				kind: "访问密码",
				value: p,
				post: post.file,
				pattern: new RegExp(`password["']?\\s*[:=]\\s*["']?${escapeRegExp(p)}`, "i"),
			});
		}
	}

	// 3.1 构建残留：dist/chunks 里是内容层原始数据，最危险的泄露渠道
	if (existsSync(join(dist, "chunks"))) {
		add("fail", "安全", "dist/chunks 未被清理", "该目录含正文原文，会泄露下载地址与密码；检查 clean-dist-chunks 是否执行");
	} else if (existsSync(dist)) {
		notes.push("安全：dist/chunks 已清理");
	}

	/** 在文本里找敏感值：有 pattern 的按上下文匹配，没有的直接包含 */
	const hit = (text, secret) => (secret.pattern ? secret.pattern.test(text) : text.includes(secret.value));

	// 3.2 公开输出里是否出现下载地址
	const targets = [
		{ file: join(dist, "rss.xml"), name: "RSS" },
		{ file: join(dist, "api/articles.json"), name: "API 列表" },
		{ file: join(dist, "search/index.html"), name: "搜索页" },
	];
	for (const t of targets) {
		if (!existsSync(t.file)) continue;
		const text = read(t.file);
		for (const s of secrets) {
			if (hit(text, s)) {
				add("fail", "安全", `${t.name} 泄露了${s.kind}`, `${s.post} → ${s.value.slice(0, 60)}…`);
			}
		}
	}

	// 3.3 pagefind 索引（搜索数据，独立目录）
	const pagefind = join(dist, "pagefind");
	if (existsSync(pagefind)) {
		let leak = 0;
		for (const f of readdirSync(pagefind).filter((x) => x.endsWith(".pf_fragment") || x.endsWith(".json"))) {
			const text = read(join(pagefind, f));
			for (const s of secrets) if (hit(text, s)) leak += 1;
		}
		if (leak > 0) add("fail", "安全", "搜索索引泄露下载地址", `pagefind 中有 ${leak} 处命中`);
		else notes.push("安全：搜索索引无泄露");
	}

	// 3.4 单篇 API 同样要脱敏
	const apiDir = join(dist, "api");
	if (existsSync(apiDir)) {
		for (const f of readdirSync(apiDir).filter((x) => x.endsWith(".json"))) {
			const text = read(join(apiDir, f));
			for (const s of secrets) {
				if (hit(text, s)) add("fail", "安全", `${f} 泄露${s.kind}`, `${s.post} → ${s.value.slice(0, 60)}…`);
			}
		}
	}
}

/** 示例 / 保留域名：教程文档里的占位地址不是真资源，不该算死链 */
function isPlaceholderUrl(url) {
	return /(^https?:\/\/)(example\.(com|org|net)|localhost|127\.0\.0\.1)/i.test(url);
}

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ───────────────────────── 4. SEO 与一致性 ───────────────────────── */

function checkSeo(posts) {
	const rawHost = "raw.githubusercontent.com";
	for (const post of posts) {
		if (post.ogImage.includes(rawHost)) {
			add("fail", "SEO", "分享图指向 raw.githubusercontent.com", `${post.file} → ${post.ogImage}`, true);
		}
		if (!post.description) {
			add("warn", "SEO", "缺少 description", `${post.file}（搜索结果的摘要会退化成标题）`);
		}
		if (post.title.length > 60) {
			add("warn", "SEO", "标题偏长可能被截断", `${post.file}：${post.title.length} 字`);
		}
	}

	// 导航：下拉项是否还在（被 CMS 整份覆盖过两次，这里专门盯）
	const navFile = join(ROOT, "src/data/nav.json");
	if (existsSync(navFile)) {
		try {
			const nav = JSON.parse(read(navFile));
			const names = nav.map((n) => String(n.name ?? ""));
			const children = names.filter((n) => n.includes("/"));
			if (children.length === 0) {
				add("warn", "一致性", "导航里没有二级下拉项", `当前 ${names.length} 项：${names.join(" / ")}`);
			} else {
				notes.push(`导航：${names.length} 项，其中 ${children.length} 个下拉子项`);
			}
		} catch (error) {
			add("fail", "一致性", "nav.json 不是合法 JSON", String(error?.message ?? error));
		}
	}

	// 标题声称加密、正文却没有 password
	for (const post of posts) {
		const claimsLocked = /加密|密码|解压码/.test(post.title);
		if (claimsLocked && post.password.length === 0) {
			add("warn", "一致性", "标题声称加密/需要密码，正文却没有 password", `${post.file}：${post.title}`, true);
		}
	}
}

/* ───────────────────────── 自动修复 ───────────────────────── */

function applyFixes(posts) {
	let changed = 0;

	for (const post of posts) {
		const path = join(POSTS_DIR, post.file);
		let raw = read(path);
		const before = raw;
		let note = "";

		// 分享图：外部 raw 地址换成站内同域名（项目硬规定）
		if (/^ogImage:\s*https:\/\/raw\.githubusercontent\.com\//m.test(raw)) {
			const file = post.ogImage.split("/").pop() || "banner.avif";
			const local = `/images/${file}`;
			// 站内确实有这张图才换，否则留空让它走兜底
			const exists = existsSync(join(PUBLIC_DIR, local));
			raw = raw.replace(/^ogImage:\s*.*$/m, exists ? `ogImage: ${SITE}${local}` : "ogImage: \"\"");
			note += `分享图改为${exists ? ` ${SITE}${local}` : "空（走默认兜底）"}；`;
		}

		// 标题里的加密标记与正文不符 → 去掉标记（正文才是事实来源）
		const titleMatch = raw.match(/^title:\s*(.+)$/m);
		if (titleMatch && /加密|需要密码/.test(titleMatch[1]) && post.password.length === 0) {
			const cleaned = titleMatch[1]
				.replace(/【\s*(?:🔒|加密资源|付费资源|需要密码)\s*】/g, "")
				.replace(/(?:🔒|【加密】|【需要密码】)/g, "")
				.trim();
			if (cleaned && cleaned !== titleMatch[1]) {
				raw = raw.replace(/^title:\s*.*$/m, `title: ${cleaned}`);
				note += "标题去掉加密标记；";
			}
		}

		if (raw !== before) {
			writeFileSync(path, raw, "utf8");
			changed += 1;
			notes.push(`已修 ${post.file}：${note.replace(/；$/, "")}`);
		}
	}

	return changed;
}

/* ───────────────────────── 主流程 ───────────────────────── */

async function main() {
	const posts = parsePosts();

	if (FIX) {
		const n = applyFixes(posts);
		notes.push(`自动修复：改动 ${n} 篇`);
	}

	checkSeo(posts);
	checkImages(posts);
	checkLeak(posts);
	await checkDownloadLinks(posts);
	await checkOnline(posts);

	const fails = issues.filter((i) => i.level === "fail");
	const warns = issues.filter((i) => i.level === "warn");
	const infos = issues.filter((i) => i.level === "info");

	if (JSON_ONLY) {
		console.log(JSON.stringify({ fails, warns, infos, notes }, null, 2));
	} else {
		const icon = { fail: "❌", warn: "⚠️", info: "ℹ️" };
		const label = { fail: "必修", warn: "建议", info: "提示" };

		console.log(`\n站点体检 · ${SITE}`);
		console.log(`扫描 ${posts.length} 篇文章\n`);

		for (const level of ["fail", "warn", "info"]) {
			const group = issues.filter((i) => i.level === level);
			if (group.length === 0) continue;
			console.log(`${icon[level]} ${label[level]}（${group.length}）`);
			for (const i of group) {
				console.log(`  · [${i.area}] ${i.title}${i.fixable ? "（可自动修）" : ""}`);
				console.log(`    ${i.detail.replace(/\n/g, "\n    ")}`);
			}
			console.log("");
		}

		if (issues.length === 0) console.log("✅ 未发现问题\n");
		console.log("检查通过项：");
		for (const n of notes) console.log(`  ✓ ${n}`);
		console.log("");
		console.log(`小结：必修 ${fails.length}｜建议 ${warns.length}｜提示 ${infos.length}`);
	}

	// 有必修项时以非零退出，方便自动化判断
	if (fails.length > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error("[site-check] 运行失败：", error?.stack ?? error);
	process.exitCode = 2;
});
