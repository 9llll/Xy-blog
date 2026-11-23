import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string): string {
	return url(`/${slug}/`);
}

export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`);
}

/**
 * 分类链接指向静态聚合页 /category/父/子/
 *
 * 早先指向 /archive/?category=xxx。问题在于本站 canonical 会剥掉 query，
 * 于是所有分类筛选页的 canonical 全落到 /archive/，搜索引擎判定为重复内容，
 * 分类页永远不会被单独收录 —— 而分类恰恰是最好的长尾入口。
 * 现在每个分类有独立路径、独立标题与描述，可正常进 sitemap。
 * 归档页的参数筛选保留，但只作站内交互，不再产生对外链接。
 */
export function getCategoryUrl(category: string[] | string | null): string {
	let categoryToUse: string | null = null;

	if (Array.isArray(category)) {
		// 如果是数组，取第一个非空的分类
		categoryToUse = category.find((cat) => cat && cat.trim() !== "") || null;
	} else {
		categoryToUse = category;
	}

	if (
		!categoryToUse ||
		categoryToUse.trim() === "" ||
		categoryToUse.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url("/archive/?uncategorized=true");

	// 逐段编码：斜杠是层级分隔符，必须保留，只对每段中文做转义
	const segments = categoryToUse
		.split("/")
		.map((segment) => segment.trim())
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment));

	return url(`/category/${segments.join("/")}/`);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}
