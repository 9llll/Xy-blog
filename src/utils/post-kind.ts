/**
 * 文章类型徽章：用来在列表里一眼区分「免费 / 加密 / 资讯 / 开源」。
 *
 * 判定完全基于正文，不依赖 frontmatter 手填，避免作者漏标：
 *   1. 含 ::download 指令且带 code="…"（提取码） → 加密资源
 *   2. 含 ::download 指令但没有提取码            → 免费资源
 *   3. 没有下载指令但正文有 GitHub 仓库地址        → 开源项目
 *   4. 以上都不是                                → 资讯博文
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

/** 分类标签统一天蓝色底白字 */
export const CATEGORY_BADGE_COLOR = "#0ea5e9";

const DOWNLOAD_DIRECTIVE = /::download\{([^}]*)\}/g;
/** 只认具体仓库地址（github.com/owner/repo），避免误判单纯提到 GitHub 的文字 */
const GITHUB_REPO = /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i;

export function getPostKind(body: string | undefined): PostKind {
	// 教程类文章会把指令/链接写在代码块里当示例，先剥掉再判定，避免误判成资源帖
	const text = (body ?? "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`\n]*`/g, " ");

	let hasDownload = false;
	let hasCode = false;
	for (const match of text.matchAll(DOWNLOAD_DIRECTIVE)) {
		hasDownload = true;
		const code = match[1].match(/\bcode\s*=\s*"([^"]*)"/);
		if (code && code[1].trim()) {
			hasCode = true;
			break;
		}
	}

	if (hasDownload) return hasCode ? "locked" : "free";
	if (GITHUB_REPO.test(text)) return "oss";
	return "news";
}
