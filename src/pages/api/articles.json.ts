import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { sanitizeMarkdownForFeed } from "@/utils/markdown-sanitize";

const robotsTxt = `
User-agent: *
Disallow: /_astro/

Sitemap: ${new URL("sitemap-index.xml", import.meta.env.SITE).href}
`.trim();

export const GET: APIRoute = async () => {
	const articles = await getCollection("posts");
	// 公开接口：正文必须脱敏，否则 ::download 里的
	// 下载地址 / 访问密码 / 提取码会随文章内容一起泄露出去
	const safeArticles = articles.map((article) => ({
		...article,
		body: sanitizeMarkdownForFeed(article.body ?? ""),
	}));
	return new Response(JSON.stringify(safeArticles), {
		headers: {
			"Content-Type": "application/json",
		},
	});
};
