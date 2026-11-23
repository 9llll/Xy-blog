/**
 * 对外输出（/api/*.json、搜索页内联数据）的文章投影
 *
 * 背景：Astro 5 的 collection entry 除了 id / slug / data / body，还挂着一批
 * 内部字段，其中 `rendered.html` 是**完整渲染后的正文 HTML**。之前接口和搜索页
 * 直接 `...article` 展开，等于把整篇正文（含 ::download 渲染出的下载按钮、
 * 代码块里演示的指令原文）原样塞进公开 JSON 与页面源码 —— body 的脱敏被完全绕过。
 *
 * 这里只放行白名单字段：id、slug、frontmatter（data），需要正文时单独传入
 * 已脱敏的 body。rendered / filePath / digest / assetImports 一律不外泄。
 */
import type { CollectionEntry } from "astro:content";
import { sanitizeMarkdownForFeed } from "@/utils/markdown-sanitize";

type Post = CollectionEntry<"posts">;

export interface PublicPost {
	id: string;
	slug: string;
	data: Post["data"];
	body?: string;
}

interface Options {
	/** 是否附带正文（会强制走 sanitizeMarkdownForFeed 脱敏） */
	withBody?: boolean;
}

export function toPublicPost(post: Post, options: Options = {}): PublicPost {
	const publicPost: PublicPost = {
		id: post.id,
		slug: post.slug,
		data: post.data,
	};

	if (options.withBody) {
		publicPost.body = sanitizeMarkdownForFeed(post.body ?? "");
	}

	return publicPost;
}
