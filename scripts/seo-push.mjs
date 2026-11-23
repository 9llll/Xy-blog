/**
 * 主动推送收录
 *
 * 搜索引擎发现新页面的三条路：
 *   1. sitemap（被动，靠蜘蛛自己来读，慢）
 *   2. 外链（被动，要别人链你）
 *   3. 主动推送（本脚本，发一次就在队列里）
 *
 * 这里做第 3 条：
 *   - IndexNow：一次推送同时通知 Bing / Yandex / Naver / Seznam / DuckDuckGo
 *     （DuckDuckGo 与 ChatGPT 搜索都用 Bing 的索引，所以这条最值钱）
 *     无需注册账号，只要站点根目录放一个「key 同名 .txt」文件即可
 *   - 百度主动推送：需要站点在百度搜索资源平台验证后拿到的 token，
 *     通过环境变量 BAIDU_TOKEN 传入；没配就自动跳过，不影响 IndexNow
 *
 * 默认增量：只推 lastmod 比上次推送记录更新的 URL。
 * 状态存在 .seo-cache/pushed.json（已 gitignore），CI 里靠 cache 持久化。
 *
 * 用法：
 *   node scripts/seo-push.mjs            增量推送
 *   node scripts/seo-push.mjs --all      全量推送
 *   node scripts/seo-push.mjs --dry      只打印不发送
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://www.3x3.top";
const HOST = new URL(SITE).host;
/** IndexNow 的 key，与 public/<key>.txt 的文件名、内容三者必须一致 */
const INDEXNOW_KEY = "6292379dce0a7882f3563cdf4ffac798";

const args = new Set(process.argv.slice(2));
const FORCE_ALL = args.has("--all");
const DRY_RUN = args.has("--dry");
/** 默认以线上 sitemap 为准：本地 dist 可能是几天前的旧产物，推错了照样记账，反而漏推新页面 */
const USE_LOCAL = args.has("--local");

const dist = join(process.cwd(), "dist");
const stateDir = join(process.cwd(), ".seo-cache");
const stateFile = join(stateDir, "pushed.json");

/** 不该进收录队列的路径：接口、搜索结果、404 */
const EXCLUDE = [/\/api\//, /\/search\//, /\/404(\.html)?$/];

/**
 * 从 sitemap 文本里提取 <loc> 与 <lastmod>
 * 不引 XML 解析库：sitemap 结构固定，正则足够且没有依赖成本
 */
function parseUrlset(xml) {
	const entries = [];
	const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
	for (const block of blocks) {
		const loc = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
		if (!loc) continue;
		const lastmod = block.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1] ?? null;
		entries.push({ loc: loc.replace(/&amp;/g, "&"), lastmod });
	}
	return entries;
}

/** 拉取一个 sitemap 的全部 url（index 会自动展开子 sitemap） */
async function collectFromSitemap(sitemapUrl) {
	const res = await fetch(sitemapUrl, { headers: { "user-agent": "Xy-blog-seo-push/1.0" } });
	if (!res.ok) throw new Error(`拉取 ${sitemapUrl} 失败：HTTP ${res.status}`);
	const xml = await res.text();

	if (/<sitemapindex/.test(xml)) {
		const children = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
		const all = [];
		for (const child of children) all.push(...(await collectFromSitemap(child)));
		return all;
	}
	return parseUrlset(xml);
}

/**
 * 默认读线上 sitemap —— 那是「真实可访问的页面集合」。
 * 只有刚构建完、想赶在部署前推送时才用 --local 读 dist。
 * 本地 dist 若已过期，推出去的是一批旧 URL，还会被记成已推，新页面就漏了。
 */
async function collectUrls() {
	if (USE_LOCAL && existsSync(dist)) {
		const files = readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f));
		if (files.length > 0) {
			const all = [];
			for (const f of files) all.push(...parseUrlset(readFileSync(join(dist, f), "utf8")));
			console.log(`[sitemap] 来源：本地 dist（${files.length} 个文件）`);
			return all;
		}
	}
	console.log("[sitemap] 来源：线上");
	return collectFromSitemap(`${SITE}/sitemap-index.xml`);
}

function loadState() {
	if (!existsSync(stateFile)) return {};
	try {
		return JSON.parse(readFileSync(stateFile, "utf8"));
	} catch {
		return {};
	}
}

function saveState(state) {
	if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
	writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/** 判定是否需要推送：没有 lastmod 的保守地推一次 */
function selectChanged(entries, state) {
	if (FORCE_ALL) return entries;
	return entries.filter((e) => {
		const pushed = state[e.loc];
		if (!pushed) return true;
		// 没有 lastmod 时比较不出变化，已推过就不再推
		if (!e.lastmod) return false;
		return new Date(e.lastmod).getTime() > new Date(pushed.lastmod ?? 0).getTime();
	});
}

async function pushIndexNow(urls) {
	const endpoint = "https://api.indexnow.org/indexnow";
	const body = {
		host: HOST,
		key: INDEXNOW_KEY,
		keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
		urlList: urls,
	};

	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json; charset=utf-8" },
		body: JSON.stringify(body),
	});

	// IndexNow 的返回码含义：200/202 成功；403 key 不匹配；422 URL 不属于该 host；429 推太频
	const tips = {
		200: "已受理",
		202: "已受理（key 校验待处理）",
		400: "请求格式错误",
		403: "key 校验失败：确认 public/<key>.txt 已上线且内容与文件名一致",
		422: "URL 与 host 不匹配",
		429: "推送过于频繁，稍后再试",
	};
	return { status: res.status, text: (await res.text()).trim(), tip: tips[res.status] ?? "未知状态" };
}

async function pushBaidu(urls) {
	const token = process.env.BAIDU_TOKEN?.trim();
	if (!token) return { skipped: true };
	const endpoint = `http://data.zz.baidu.com/urls?site=${SITE}&token=${token}`;
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "text/plain" },
		body: urls.join("\n"),
	});
	return { skipped: false, status: res.status, text: (await res.text()).trim().slice(0, 300) };
}

async function main() {
	const entries = (await collectUrls()).filter((e) => !EXCLUDE.some((re) => re.test(e.loc)));
	const unique = [...new Map(entries.map((e) => [e.loc, e])).values()];
	const state = loadState();
	const changed = selectChanged(unique, state);

	console.log(`[统计] sitemap 共 ${unique.length} 个 URL，需推送 ${changed.length} 个`);
	if (changed.length === 0) {
		console.log("[跳过] 没有新增或变更的页面");
		return;
	}

	const urls = changed.map((e) => e.loc);
	if (DRY_RUN) {
		console.log("[dry] 将推送：\n" + urls.map((u) => `  ${u}`).join("\n"));
		return;
	}

	let ok = false;

	// IndexNow 单次上限 10000，按 5000 分片稳妥些
	for (let i = 0; i < urls.length; i += 5000) {
		const chunk = urls.slice(i, i + 5000);
		const r = await pushIndexNow(chunk);
		console.log(`[IndexNow] HTTP ${r.status} — ${r.tip}${r.text ? `｜${r.text}` : ""}`);
		if (r.status === 200 || r.status === 202) ok = true;
	}

	const baidu = await pushBaidu(urls);
	if (baidu.skipped) {
		console.log("[百度] 未配置 BAIDU_TOKEN，跳过（配置方法见 scripts/seo-push.mjs 顶部注释）");
	} else {
		console.log(`[百度] HTTP ${baidu.status} — ${baidu.text}`);
	}

	// 只有真正被受理才记账，避免推送失败被误标为「已推过」而漏掉
	if (ok) {
		const now = new Date().toISOString();
		for (const e of changed) state[e.loc] = { lastmod: e.lastmod, pushedAt: now };
		saveState(state);
		console.log(`[记录] 已更新推送状态，共 ${Object.keys(state).length} 条`);
	} else {
		console.log("[记录] 本次未被受理，不记状态，下次会重试");
	}
}

main().catch((error) => {
	console.error("[seo-push] 失败：", error?.message ?? error);
	process.exitCode = 1;
});
