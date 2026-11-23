/**
 * 搜索用的派生标签（facets）
 *
 * 站内搜索原本只匹配 标题 / 简介 / tags / category 的字面文本，因此
 * 「免费资源」「加密资源」「百度网盘」这类概念搜不到 —— 它们不是作者手写的
 * tag，而是下载资源的属性。这里在构建期把它们派生出来，随文章一起内联进
 * 搜索页（并进入 /api/articles.json），让搜索能按资源属性检索。
 *
 * 安全边界：只输出「有没有提取码/密码」的布尔值与网盘名称，
 * 口令原文、提取码原文、下载地址一律不进入 facets。
 */

import { NETDISK, detectNetdisk } from "./netdisk";
import {
	POST_KIND_META,
	collectDownloadEntries,
	getPostKind,
	type PostKind,
} from "./post-kind";

/**
 * 类型词的同义说法：用户不一定记得徽章上的措辞。
 *
 * 注意：搜索是子串包含匹配，同义词里绝不能出现「反向词」——
 * 例如给免费资源加「不加密」，会让搜「加密」的用户命中全部免费资源
 * （「不加密」含有「加密」子串）。所以免费侧只放正向表述。
 */
const KIND_SYNONYMS: Record<PostKind, string[]> = {
	free: ["免费资源", "免费", "免费下载", "无密码", "不需要密码", "免密码", "直接下载"],
	locked: ["加密资源", "加密", "有密码", "需要密码", "需要访问密码", "访问密码", "解压密码", "密码保护"],
	news: ["资讯博文", "资讯", "文章", "教程", "攻略"],
	oss: ["开源项目", "开源", "github", "仓库"],
};

/** 网盘同义说法（含用户常搜的简称与英文域名品牌） */
const NETDISK_SYNONYMS: Record<string, string[]> = {
	baidu: ["百度", "百度网盘", "百度云", "baidupan"],
	quark: ["夸克", "夸克网盘", "夸克云盘"],
	aliyun: ["阿里云", "阿里云盘", "阿里"],
	"123": ["123", "123网盘", "123云盘"],
	lanzou: ["蓝奏", "蓝奏云", "蓝奏网盘"],
	tianyi: ["天翼", "天翼云", "天翼云盘", "189"],
	xunlei: ["迅雷", "迅雷云盘"],
	chengtong: ["城通", "城通网盘", "ctfile"],
	cowtransfer: ["奶牛", "奶牛快传"],
	weiyun: ["微云", "腾讯微云"],
	"360": ["360", "360云盘"],
	"115": ["115", "115网盘"],
	pikpak: ["pikpak"],
};

export interface PostSearchFacets {
	kind: PostKind;
	kindLabel: string;
	kindColor: string;
	/** 网盘注册表 key，例如 baidu / quark */
	netdisks: string[];
	/** 网盘展示名，例如 百度网盘 / 夸克网盘 / 蓝奏云（已带后缀，前端直接显示） */
	netdiskLabels: string[];
	hasCode: boolean;
	hasPassword: boolean;
	/** 派生出的可搜索词（已小写去重）；标题/简介/标签由前端自行拼接 */
	terms: string[];
}

/**
 * 网盘展示名。部分品牌名自带「云」（蓝奏云 / 天翼云 / 微云 / 阿里云），
 * 再拼「网盘」会变成「蓝奏云网盘」，所以只对不带「云」的补后缀。
 */
export function netdiskDisplayLabel(key: string): string {
	const label = NETDISK[key]?.label ?? key;
	return /云$/.test(label) ? label : `${label}网盘`;
}

export interface FacetInput {
	title?: string;
	description?: string;
	tags?: string[];
	category?: string[];
	keywords?: string[];
	body?: string;
	downloadLinks?: unknown;
	kind?: string;
}

export function buildSearchFacets(input: FacetInput): PostSearchFacets {
	const entries = collectDownloadEntries(input.body, input.downloadLinks);
	const kind = getPostKind(input.body, input.kind, input.downloadLinks);
	const meta = POST_KIND_META[kind];

	const netdisks: string[] = [];
	for (const entry of entries) {
		const key = detectNetdisk(entry.url);
		if (key && !netdisks.includes(key)) netdisks.push(key);
	}

	const terms = new Set<string>();
	const add = (value?: string) => {
		const text = (value ?? "").trim().toLowerCase();
		if (text) terms.add(text);
	};

	add(meta.label);
	for (const word of KIND_SYNONYMS[kind]) add(word);

	for (const key of netdisks) {
		const label = NETDISK[key]?.label;
		add(key);
		add(label);
		if (label) add(`${label}网盘`);
		for (const word of NETDISK_SYNONYMS[key] ?? []) add(word);
	}

	if (entries.length > 0) {
		add("网盘");
		add("下载");
		if (netdisks.length === 0) add("直链");
		add(entries.some((entry) => entry.hasCode) ? "有提取码" : "无提取码");
		add(entries.some((entry) => entry.hasCode) ? "含提取码" : "免提取码");
		add(entries.some((entry) => entry.hasCode) ? "需要提取码" : "不需要提取码");
	}

	return {
		kind,
		kindLabel: meta.label,
		kindColor: meta.color,
		netdisks,
		netdiskLabels: netdisks.map(netdiskDisplayLabel),
		hasCode: entries.some((entry) => entry.hasCode),
		hasPassword: entries.some((entry) => entry.hasPassword),
		terms: [...terms],
	};
}

/** 搜索页的快捷筛选标签（只保留真实存在文章的那几项） */
export interface FacetChip {
	label: string;
	query: string;
	count: number;
}

export function buildFacetChips(
	facetsList: PostSearchFacets[],
): FacetChip[] {
	const chips: FacetChip[] = [];
	const kindOrder: PostKind[] = ["free", "locked", "oss", "news"];
	for (const kind of kindOrder) {
		const count = facetsList.filter((facets) => facets.kind === kind).length;
		if (count > 0) {
			chips.push({ label: POST_KIND_META[kind].label, query: POST_KIND_META[kind].label, count });
		}
	}

	const netdiskCount = new Map<string, number>();
	for (const facets of facetsList) {
		for (const key of facets.netdisks) {
			netdiskCount.set(key, (netdiskCount.get(key) ?? 0) + 1);
		}
	}
	for (const [key, count] of [...netdiskCount.entries()].sort((a, b) => b[1] - a[1])) {
		const label = netdiskDisplayLabel(key);
		chips.push({ label, query: label, count });
	}

	const codeCount = facetsList.filter((facets) => facets.hasCode).length;
	if (codeCount > 0) {
		chips.push({ label: "有提取码", query: "有提取码", count: codeCount });
	}

	return chips;
}
