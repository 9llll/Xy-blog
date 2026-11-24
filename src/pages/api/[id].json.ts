import { getImage } from "astro:assets";
import { getCollection } from "astro:content";
import type { APIRoute, ImageMetadata } from "astro";
import path from "node:path";
import MarkdownIt from "markdown-it";
import { isApiCover, resolveCoverImage } from "../../utils/cover-image";
import { sanitizeMarkdownForFeed } from "../../utils/markdown-sanitize";

// 预加载两处图片资源，用于把 frontmatter 里的相对路径解析成
// Astro 构建后的 /_astro/xxx 真实地址：
//   - src/assets/**        —— 老文章把图放在这里
//   - src/content/posts/** —— 现在 CMS 上传的图片都落在文章目录下
// 早期版本只扫了 src/assets，文章封面（src/content/posts/images/xxx.avif）
// 一律解析失败退成 32px 的 favicon，::post 卡片才会显示成破图。
const assetImages = import.meta.glob<ImageMetadata>("../../assets/**", {
	import: "default",
});
const contentImages = import.meta.glob<ImageMetadata>(
	"../../content/posts/**/*.{avif,png,jpg,jpeg,webp,gif,svg}",
	{ import: "default" },
);

// 把 frontmatter 的 image 字段解析为可访问的 URL：
//   - 远程图片（http/https）：原样返回
//   - public/ 绝对路径（以 / 开头）：原样返回
//   - "api"：随机封面图 API（带 seed 参数，保证同一文章封面稳定）
//   - 相对路径：优先按文章所在目录解析到 src/content/posts，再退回 src/assets
async function resolveImageUrl(
	p: unknown,
	seed?: string,
	dir = "",
): Promise<string> {
	const fallback = "/favicon/favicon-32x32.png";
	if (!p || typeof p !== "string") return fallback;
	const s = String(p).trim();
	if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/"))
		return s;

	// 随机封面图：解析为带 seed 的 API 地址
	if (isApiCover(s)) {
		return resolveCoverImage(s, seed) || fallback;
	}

	const filename = s
		.replace(/^\.?\//, "")
		.split("/")
		.pop();
	if (!filename) return fallback;

	const asImage = async (loader: () => Promise<ImageMetadata>) => {
		try {
			const { src } = await getImage({ src: await loader() });
			return src;
		} catch {
			return "";
		}
	};

	// 1) 按文章所在目录相对定位（CMS 上传的图与文章同级或在其 images/ 下）
	const rel = path.posix.normalize(path.posix.join(dir, s.replace(/^\.?\//, "")));
	const contentKey = `../../content/posts/${rel}`;
	if (contentKey in contentImages) {
		const url = await asImage(contentImages[contentKey]);
		if (url) return url;
	}

	// 2) 同名的 content 图片（兼容嵌套目录下引用别的文章的图）
	const contentMatch = Object.keys(contentImages).find((k) =>
		k.endsWith(`/${filename}`),
	);
	if (contentMatch) {
		const url = await asImage(contentImages[contentMatch]);
		if (url) return url;
	}

	// 3) 退回 src/assets 下的同名图
	const directKey = `src/assets/images/${filename}`;
	const assetKey =
		(directKey in assetImages && directKey) ||
		Object.keys(assetImages).find((k) => k.endsWith(`/${filename}`)) ||
		"";
	if (assetKey) {
		const url = await asImage(assetImages[assetKey]);
		if (url) return url;
	}

	return fallback;
}

export const prerender = true;

export async function getStaticPaths() {
	try {
		const articles = await getCollection("posts");
		return articles.flatMap((article) => {
			const cleanId = article.id.replace(/\.md$/, "");
			return [{ params: { id: cleanId } }, { params: { id: `${cleanId}/` } }];
		});
	} catch (error) {
		console.error("getStaticPaths执行错误:", error);
		return [];
	}
}

export const GET: APIRoute = async ({ params }) => {
	try {
		const { id } = params;

		if (!id || typeof id !== "string" || id.trim() === "") {
			return new Response(
				JSON.stringify({ code: "400", message: "请提供有效的文章ID" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const cleanId = id.trim().replace(/\/$/, "");
		const articles = await getCollection("posts");
		const articleId = `${cleanId}.md`;
		const article = articles.find((item) => item.id === articleId);

		if (!article) {
			return new Response(
				JSON.stringify({
					code: "404",
					message: `文章ID不存在: ${cleanId}`,
				}),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		// 封面回退链与列表页保持一致：frontmatter.image → 正文第一张图 → 随机封面 API。
		// 否则只传图不填封面字段的文章，在引用卡片里会是没有封面的空块。
		const a = article;
		const frontmatter = a.data;
		const bodyRaw = a.body ?? "";
		const firstBodyImage =
			bodyRaw.match(/!\[[^\]]*\]\(\s*<?([^\s)>]+)>?[^)]*\)/)?.[1] ??
			bodyRaw.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ??
			"";
		const dir = a.id.includes("/") ? a.id.slice(0, a.id.lastIndexOf("/")) : "";
		const coverSource =
			String(frontmatter?.image ?? "").trim() || firstBodyImage || "api";
		const imageUrlNormalized = await resolveImageUrl(coverSource, a.id, dir);

		// 阅读时长取自 remark 插件写入的 frontmatter，拿不到就不返回该字段，
		// 前端会直接省略（早期版本硬编码「5 分钟」，对每篇都是错的）
		let minutes: number | null = null;
		try {
			const { remarkPluginFrontmatter } = await a.render();
			const value = Number(remarkPluginFrontmatter?.minutes);
			if (Number.isFinite(value) && value > 0) minutes = value;
		} catch {
			// 渲染失败不影响卡片其它信息
		}

		// 使用markdown-it渲染HTML
		// 注意：这是公开接口，必须先脱敏，否则 ::download 里的
		// 下载地址 / 访问密码 / 提取码会随正文一起泄露出去
		const md = new MarkdownIt();
		const renderedHTML = md.render(sanitizeMarkdownForFeed(a.body));

		// 公开接口：frontmatter 里的 downloadLinks 是 CMS 表单原文，
		// 第 3、4 列就是提取码与访问密码，必须剔除后才能外发
		const { downloadLinks: _omitDownloadLinks, ...publicFrontmatter } =
			frontmatter as typeof frontmatter & { downloadLinks?: unknown };

		return new Response(
			JSON.stringify({
				...publicFrontmatter,
				image: imageUrlNormalized,
				minutes,
				body: renderedHTML,
				slug: a.slug,
				id: a.id,
				// 调试信息（仅开发环境）
				...(process.env.NODE_ENV === "development" && {
					debug: {
						originalPath: frontmatter?.image,
						processedPath: imageUrlNormalized,
						environment: process.env.NODE_ENV || "development",
					},
				}),
			}),
			{
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "public, max-age=60",
				},
			},
		);
	} catch (error) {
		console.error("请求处理错误:", error);
		return new Response(
			JSON.stringify({
				code: "500",
				message:
					process.env.NODE_ENV === "development"
						? error instanceof Error
							? error.message
							: "服务器错误"
						: "服务器内部错误",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
