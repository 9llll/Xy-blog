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
 *
 * downloadLinks 例外：它是 Pages CMS 表单里填的多行原文，第 3、4 列就是提取码和
 * 访问密码。它必须留在 frontmatter 里供构建期生成卡片，但**不能**进公开投影 ——
 * 搜索引擎需要的「免费/加密、网盘类型、有无提取码」都已由 facets 以布尔形式给出。
 */
import type { CollectionEntry } from "astro:content";
import { sanitizeMarkdownForFeed } from "@/utils/markdown-sanitize";
import { buildSearchFacets, type PostSearchFacets } from "@/utils/search-facets";

type Post = CollectionEntry<"posts">;
/** 对外投影里不含 downloadLinks（含口令原文） */
export type PublicPostData = Omit<Post["data"], "downloadLinks">;

export interface PublicPost {
	id: string;
	slug: string;
	data: PublicPostData;
	/** 派生标签：免费/加密、网盘类型、有无提取码，只含布尔与词表，不含口令 */
	facets: PostSearchFacets;
	body?: string;
}

interface Options {
	/** 是否附带正文（会强制走 sanitizeMarkdownForFeed 脱敏） */
	withBody?: boolean;
}

export function toPublicPost(post: Post, options: Options = {}): PublicPost {
	const data = post.data;
	const downloadLinks = (data as { downloadLinks?: unknown }).downloadLinks;

	// 显式剔除表单原文：z.object 会原样保留它，直接透传等于把密码和提取码写进页面源码
	const safeData: Record<string, unknown> = { ...(data as Record<string, unknown>) };
	delete safeData.downloadLinks;

	const publicPost: PublicPost = {
		id: post.id,
		slug: post.slug,
		data: safeData as PublicPostData,
		facets: buildSearchFacets({
			title: data.title,
			description: data.description,
			tags: data.tags,
			category: data.category,
			keywords: data.keywords,
			body: post.body,
			downloadLinks,
			kind: data.kind,
		}),
	};

	if (options.withBody) {
		publicPost.body = sanitizeMarkdownForFeed(post.body ?? "");
	}

	return publicPost;
}
