/**
 * 文章类型徽章：用来在列表里一眼区分「免费 / 加密 / 资讯 / 开源」。
 *
 * 判定口径（按资源实际是否需要密码，而不是有没有网盘提取码）：
 *   1. 含下载资源且带 password（解压/文件密码） → 加密资源
 *   2. 含下载资源但没有 password（仅有 code 提取码或直接链接） → 免费资源
 *   3. 没有下载资源但正文有 GitHub 仓库地址        → 开源项目
 *   4. 以上都不是                                → 资讯博文
 *
 * 提取码 code 只是网盘的访问口令，资源本身是免费分享的，所以不算「加密」；
 * 只有作者真的设置了密码（password）才显示红色「加密资源」。
 *
 * 下载资源有两个来源，两处都要认，否则用 Pages CMS 表单填的文章会被判成「资讯」：
 *   - 正文里的 ::download{url="…" code="…" password="…"} 指令
 *   - frontmatter 的 downloadLinks（一行一个网盘：名称 | 链接 | 提取码 | 密码 | 大小）
 * 正文已手写指令时，表单字段会被 remark 插件忽略，这里也以正文为准（顺序一致）。
 *
 * 作者也可以在 frontmatter 用 kind 字段手动指定，覆盖上面的自动判定
 * （例如教程文档里贴了带 password 的示例指令，标 kind: news 即可）。
 */

export type PostKind = "free" | "locked" | "news" | "oss";

export interface PostKindMeta {
	label: string;
	/** 徽章背景色（白字） */
	color: string;
}

export const POST_KIND_META: Record<PostKind, PostKindMeta> = {
	free: { label: "免费资源", color: "#16a34a" },
	locked: { label: "加密资源", color: "#ef4444" },
	news: { label: "资讯博文", color: "#9333ea" },
	oss: { label: "开源项目", color: "#111827" },
};

const DOWNLOAD_DIRECTIVE = /::download\{([^}]*)\}/g;
/** 只认具体仓库地址（github.com/owner/repo），避免误判单纯提到 GitHub 的文字 */
const GITHUB_REPO = /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i;
const URL_RE = /https?:\/\/[^\s"'<>|｜]+/i;
/** 文件大小单元格，不能被当成提取码或密码 */
const SIZE_RE = /^\d+(\.\d+)?\s*(KB|MB|GB|TB)$/i;
/** 「提取码：xxx」「密码: xxx」这类前缀 */
const LABEL_RE = /^(提取码|访问码|密码|访问密码|解压密码|文件大小|大小)\s*[:：]\s*/;
/** 带前缀时直接指定落位：密码类 → 访问密码，提取码类 → 提取码 */
const LABEL_SLOTS: [RegExp, "code" | "password"][] = [
	[/^(访问密码|解压密码|密码)\s*[:：]/, "password"],
	[/^(提取码|访问码)\s*[:：]/, "code"],
];

/**
 * 剥掉「整行被【】包住」的外层装饰，与 lineToAttributes 的同名逻辑保持一致。
 * 不剥的话 `【名称|链接||88386】` 收尾的 】 会被并进密码，用户永远输不对。
 */
function stripOuterBracket(text: string): string {
	if (!text.startsWith("【") || !text.endsWith("】")) return text;
	if ((text.match(/】/g) || []).length !== 1) return text;
	return text.slice(1, -1).trim();
}

/** 一条下载资源的最小信息（不含口令原文，只记有没有，供公开输出使用） */
export interface DownloadEntry {
	url: string;
	hasCode: boolean;
	hasPassword: boolean;
}

/** 教程类文章会把指令/链接写在代码块里当示例，先剥掉再判定，避免误判成资源帖 */
function stripCode(body?: string): string {
	return (body ?? "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
}

/** 判断指令属性里是否真的填了值（空字符串 / 空白都算没填） */
function hasValue(attrs: string, name: string): boolean {
	const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`);
	const m = attrs.match(re);
	return !!(m && m[1].trim());
}

/** 取指令属性值（未填返回空串） */
export function attrValue(attrs: string, name: string): string {
	const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`);
	const m = attrs.match(re);
	return m ? m[1].trim() : "";
}

/**
 * 表单里的一行文本 → 下载条目。
 * 规则与 remark-frontmatter-downloads 的 lineToAttributes 保持一致：
 *   - 全角竖线 ｜ 等价半角 |
 *   - 链接可以不在第二列，找不到就在整行里取第一个 http 地址
 *   - 第 3 段 = 提取码，第 4 段 = 访问密码；空段占位，文件大小不算口令
 *   - 「密码：xxx」前缀直接指定落位；整行被【】包住时先剥外层
 * 两者一致性由 scripts/verify-search-facets.mjs 对拍保证。
 */
export function parseDownloadLine(line: string): DownloadEntry | null {
	const raw = stripOuterBracket(String(line ?? "").trim());
	if (!raw || raw.startsWith("#")) return null;

	const parts = raw.split(/[|｜]/).map((s) => s.trim());
	let rest = parts.slice(1);
	let url = "";

	const urlIdx = rest.findIndex((s) => /^https?:\/\//i.test(s));
	if (urlIdx >= 0) {
		url = rest[urlIdx].match(URL_RE)?.[0] ?? "";
		rest = rest.slice(urlIdx + 1);
	} else {
		url = raw.match(URL_RE)?.[0] ?? "";
	}
	if (!url) return null;

	const fields: (string | null)[] = [null, null];
	let cursor = 0;
	for (const piece of rest) {
		const value = piece.replace(LABEL_RE, "").trim();
		if (!value) {
			cursor += 1;
			continue;
		}
		if (SIZE_RE.test(value)) continue;
		const forced = LABEL_SLOTS.find(([re]) => re.test(piece))?.[1];
		const slot = forced === "password" ? 1 : forced === "code" ? 0 : cursor;
		if (slot < 2 && fields[slot] === null) fields[slot] = value;
		cursor += 1;
	}

	return {
		url,
		hasCode: !!fields[0],
		hasPassword: !!fields[1],
	};
}

/**
 * 收集一篇文章的全部下载资源（只含「有没有口令」，不含口令原文）。
 * 正文指令优先；正文没有时才读表单字段。
 */
export function collectDownloadEntries(body?: string, downloadLinks?: unknown): DownloadEntry[] {
	const entries: DownloadEntry[] = [];

	for (const match of stripCode(body).matchAll(DOWNLOAD_DIRECTIVE)) {
		entries.push({
			url: attrValue(match[1], "url"),
			hasCode: hasValue(match[1], "code"),
			hasPassword: hasValue(match[1], "password"),
		});
	}
	if (entries.length > 0) return entries;

	if (typeof downloadLinks === "string") {
		for (const line of downloadLinks.split(/\r?\n/)) {
			const entry = parseDownloadLine(line);
			if (entry) entries.push(entry);
		}
		return entries;
	}

	if (Array.isArray(downloadLinks)) {
		for (const item of downloadLinks) {
			if (typeof item === "string") {
				const entry = parseDownloadLine(item);
				if (entry) entries.push(entry);
				continue;
			}
			if (!item || typeof item !== "object") continue;
			const record = item as Record<string, unknown>;
			const url = String(record.url ?? record.buy ?? "").trim();
			if (!url) continue;
			entries.push({
				url,
				hasCode: !!String(record.code ?? "").trim(),
				hasPassword: !!String(record.password ?? "").trim(),
			});
		}
	}

	return entries;
}

export function getPostKind(
	body?: string,
	override?: string,
	downloadLinks?: unknown,
): PostKind {
	if (override && override in POST_KIND_META) return override as PostKind;

	const entries = collectDownloadEntries(body, downloadLinks);
	if (entries.length > 0) {
		return entries.some((entry) => entry.hasPassword) ? "locked" : "free";
	}
	if (GITHUB_REPO.test(stripCode(body))) return "oss";
	return "news";
}
