/**
 * 搜索派生标签（facets）与下载行解析的验证脚本
 *
 * 两类用例：
 *   1. 对拍：search-facets 里的 parseDownloadLine 与入站插件 lineToAttributes
 *      必须对同一行给出相同的「有没有提取码 / 有没有密码」结论 ——
 *      两处解析器分处构建链两头，一旦漂移，会出现「卡片说有密码、搜索说免费」。
 *   2. 类型判定：正文指令 / 表单文本 / 代码块示例 / GitHub 仓库 四种来源，
 *      以及网盘识别与筛选标签聚合。
 *
 * 运行（源文件是 .ts，Node 不能直接解析无扩展名的相对导入，先用 esbuild 打包）：
 *   1) 打包（esbuild 是 astro 的传递依赖，不暴露 bin，用 .pnpm 下的实际路径；
 *      版本目录按本机 node_modules/.pnpm 里的 esbuild@ 版本调整）：
 *      node_modules/.pnpm/esbuild@0.25.9/node_modules/esbuild/bin/esbuild \
 *        scripts/verify-search-facets.mjs --bundle --platform=node --format=esm \
 *        --outfile=.cache-bak/verify-facets.mjs
 *   2) node .cache-bak/verify-facets.mjs
 */
import assert from "node:assert/strict";
import { lineToAttributes } from "../src/plugins/remark-frontmatter-downloads.mjs";
import {
	collectDownloadEntries,
	getPostKind,
	parseDownloadLine,
} from "../src/utils/post-kind.ts";
import { buildFacetChips, buildSearchFacets } from "../src/utils/search-facets.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
	try {
		fn();
		passed += 1;
	} catch (error) {
		failures.push(`${name} → ${error.message}`);
	}
}

/* ---------- 1. 两处解析器对拍 ---------- */
const LINES = [
	"【百度网盘】大话西游2单机版 | https://pan.baidu.com/s/1abc | 1wau | 66398 | 519 MB",
	"【夸克网盘】资源名｜https://pan.quark.cn/s/xyz｜abcd",
	"名称 | https://pan.baidu.com/s/x | 提取码：efgh",
	"https://pan.xunlei.com/s/abc",
	"名称 | https://pan.xunlei.com/s/abc || 1.2 GB",
	"名称 | https://pan.quark.cn/s/xyz | abc | 2024-01-01",
	"只有文字没有链接的一行",
	"# 这是注释",
	"",
];

for (const line of LINES) {
	check(`对拍：${line || "(空行)"}`.slice(0, 40), () => {
		const legacy = lineToAttributes(line);
		const next = parseDownloadLine(line);
		const legacyValid = !!legacy;
		assert.equal(!!next, legacyValid, "有效行判定不一致");
		if (!legacyValid) return;
		assert.equal(next.hasCode, !!(legacy.code && legacy.code.trim()), "提取码判定不一致");
		assert.equal(
			next.hasPassword,
			!!(legacy.password && legacy.password.trim()),
			"密码判定不一致",
		);
	});
}

/* ---------- 2. 资源类型判定 ---------- */
const DIRECTIVE = '::download{name="游戏" url="https://pan.baidu.com/s/1abc" code="1wau"}';
const DIRECTIVE_LOCKED =
	'::download{name="游戏" url="https://pan.quark.cn/s/1abc" code="1wau" password="66398"}';
const FORM_FREE = "【百度网盘】游戏 | https://pan.baidu.com/s/1abc | 1wau";
const FORM_LOCKED = "【百度网盘】游戏 | https://pan.baidu.com/s/1abc | 1wau | 66398 | 519 MB";
const FORM_NO_CODE = "【夸克网盘】游戏 | https://pan.quark.cn/s/1abc";

check("正文指令无密码 → 免费资源", () => {
	assert.equal(getPostKind(DIRECTIVE), "free");
});
check("正文指令有密码 → 加密资源", () => {
	assert.equal(getPostKind(DIRECTIVE_LOCKED), "locked");
});
check("表单文本无密码 → 免费资源", () => {
	assert.equal(getPostKind("正文没有指令", undefined, FORM_FREE), "free");
});
check("表单文本有密码 → 加密资源", () => {
	assert.equal(getPostKind("正文没有指令", undefined, FORM_LOCKED), "locked");
});
check("表单文本只有链接 → 免费资源", () => {
	assert.equal(getPostKind("", undefined, FORM_NO_CODE), "free");
});
check("代码块里的示例指令不参与判定 → 资讯", () => {
	assert.equal(getPostKind("```\n" + DIRECTIVE_LOCKED + "\n```"), "news");
});
check("GitHub 仓库 → 开源项目", () => {
	assert.equal(getPostKind("源码在 https://github.com/9llll/Xy-blog"), "oss");
});
check("都没有 → 资讯博文", () => {
	assert.equal(getPostKind("普通文章正文"), "news");
});
check("kind 手动覆盖优先", () => {
	assert.equal(getPostKind(DIRECTIVE_LOCKED, "news"), "news");
});
check("正文指令优先于表单字段", () => {
	assert.equal(getPostKind(DIRECTIVE, undefined, FORM_LOCKED), "free");
});

/* ---------- 3. 派生标签 ---------- */
check("免费资源的派生词含免费/百度", () => {
	const facets = buildSearchFacets({
		title: "大话西游2单机版",
		body: DIRECTIVE,
	});
	assert.equal(facets.kind, "free");
	assert.deepEqual(facets.netdisks, ["baidu"]);
	assert.equal(facets.hasCode, true);
	assert.equal(facets.hasPassword, false);
	const terms = facets.terms.join(" ");
	for (const word of ["免费资源", "免费", "百度网盘", "百度", "有提取码"]) {
		assert.ok(terms.includes(word), `缺少派生词 ${word}`);
	}
	assert.ok(!terms.includes("66398"), "口令原文不得进入派生词");
});

check("免费资源的派生词不含「加密」子串", () => {
	// 子串匹配下「不加密」会让搜「加密」的人命中全部免费资源，属反向词污染
	const facets = buildSearchFacets({ body: DIRECTIVE });
	const polluted = facets.terms.filter((term) => term.includes("加密"));
	assert.deepEqual(polluted, [], "免费资源的派生词里出现了含「加密」的词");
});

check("加密资源的派生词含加密/需要密码", () => {
	const facets = buildSearchFacets({ body: DIRECTIVE_LOCKED });
	assert.equal(facets.kind, "locked");
	const terms = facets.terms.join(" ");
	for (const word of ["加密资源", "加密", "有密码", "需要密码", "夸克网盘"]) {
		assert.ok(terms.includes(word), `缺少派生词 ${word}`);
	}
	assert.ok(!terms.includes("1wau"), "提取码原文不得进入派生词");
});

check("表单填写的文章也能派生出网盘与类型", () => {
	const facets = buildSearchFacets({ body: "没有指令", downloadLinks: FORM_LOCKED });
	assert.equal(facets.kind, "locked");
	assert.deepEqual(facets.netdiskLabels, ["百度网盘"]);
	assert.equal(facets.hasPassword, true);
});

check("多网盘文章收集全部网盘", () => {
	const facets = buildSearchFacets({
		body: `${DIRECTIVE}\n::download{name="备份" url="https://pan.quark.cn/s/2"}`,
	});
	assert.deepEqual(facets.netdisks.sort(), ["baidu", "quark"]);
	assert.deepEqual(facets.netdiskLabels.sort(), ["夸克网盘", "百度网盘"]);
});

check("品牌名自带「云」时不重复拼网盘", () => {
	const facets = buildSearchFacets({
		body: '::download{name="x" url="https://wwi.lanzoue.com/abc"}',
	});
	assert.deepEqual(facets.netdiskLabels, ["蓝奏云"]);
});

check("无下载资源的资讯文章不出现网盘词", () => {
	const facets = buildSearchFacets({ body: "普通文章" });
	assert.equal(facets.kind, "news");
	assert.deepEqual(facets.netdisks, []);
	assert.ok(!facets.terms.includes("网盘"));
});

/* ---------- 4. 快捷筛选标签 ---------- */
check("筛选标签按类型与网盘聚合，计数正确", () => {
	const list = [
		buildSearchFacets({ body: DIRECTIVE }),
		buildSearchFacets({ body: DIRECTIVE }),
		buildSearchFacets({ body: DIRECTIVE_LOCKED }),
		buildSearchFacets({ body: "普通文章" }),
	];
	const chips = buildFacetChips(list);
	const byLabel = Object.fromEntries(chips.map((chip) => [chip.label, chip.count]));
	assert.equal(byLabel["免费资源"], 2);
	assert.equal(byLabel["加密资源"], 1);
	assert.equal(byLabel["资讯博文"], 1);
	assert.equal(byLabel["百度网盘"], 2);
	assert.equal(byLabel["夸克网盘"], 1);
	assert.equal(byLabel["有提取码"], 3);
});

check("没有文章的标签不出现", () => {
	const chips = buildFacetChips([buildSearchFacets({ body: "普通文章" })]);
	assert.deepEqual(chips.map((chip) => chip.label), ["资讯博文"]);
});

/* ---------- 结果 ---------- */
console.log(`✅ 通过 ${passed} 项`);
if (failures.length) {
	console.log(`❌ 失败 ${failures.length} 项：`);
	for (const message of failures) console.log("   - " + message);
	process.exit(1);
}
