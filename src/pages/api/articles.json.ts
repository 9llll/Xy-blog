import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { toPublicPost } from "@/utils/public-post";

export const GET: APIRoute = async () => {
	const articles = await getCollection("posts");

	// 公开接口：只输出白名单字段 + 脱敏正文。
	// 不要 `...article` —— entry 上的 rendered.html 是完整正文 HTML，
	// 会把 ::download 里的下载地址 / 访问密码 / 提取码一起泄露出去。
	const safeArticles = articles.map((article) =>
		toPublicPost(article, { withBody: true }),
	);

	return new Response(JSON.stringify(safeArticles), {
		headers: {
			"Content-Type": "application/json",
		},
	});
};
