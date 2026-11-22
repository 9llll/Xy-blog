/**
 * 文章类型徽章：用来在列表里一眼区分「免费 / 加密 / 资讯 / 开源」。
 *
 * 判定口径（按资源实际是否需要密码，而不是有没有网盘提取码）：
 *   1. 含 ::download 且带 password="…"（解压/文件密码） → 加密资源
 *   2. 含 ::download 但没有 password（仅有 code 提取码或直接链接） → 免费资源
 *   3. 没有下载指令但正文有 GitHub 仓库地址        → 开源项目
 *   4. 以上都不是                                → 资讯博文
 *
 * 提取码 code 只是网盘的访问口令，资源本身是免费分享的，所以不算「加密」；
 * 只有作者真的设置了密码（password）才显示红色「加密资源」。
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

/** 判断指令属性里是否真的填了值（空字符串 / 空白都算没填） */
function hasValue(attrs: string, name: string): boolean {
	const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`);
	const m = attrs.match(re);
	return !!(m && m[1].trim());
}

export function getPostKind(body: string | undefined, override?: string): PostKind {
	if (override && override in POST_KIND_META) return override as PostKind;

	// 教程类文章会把指令/链接写在代码块里当示例，先剥掉再判定，避免误判成资源帖
	const text = (body ?? "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`\n]*`/g, " ");

	let hasDownload = false;
	let hasPassword = false;
	for (const match of text.matchAll(DOWNLOAD_DIRECTIVE)) {
		hasDownload = true;
		if (hasValue(match[1], "password")) {
			hasPassword = true;
			break;
		}
	}

	if (hasDownload) return hasPassword ? "locked" : "free";
	if (GITHUB_REPO.test(text)) return "oss";
	return "news";
}
