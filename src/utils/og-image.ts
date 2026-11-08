/**
 * 站点默认社交分享图。
 * 文件位于 public/images/site/ 下，随构建原样部署，因此一定是同域名可访问的地址。
 * 当文章未填写 ogImage 时使用，避免分享出去没有缩略图。
 */
export const DEFAULT_OG_IMAGE = "/images/site/banner.avif";

/**
 * 把社交分享图统一转成同域名绝对地址。
 * og:image / twitter:image / JSON-LD 的 image 都要求绝对地址，否则部分平台不抓取。
 *
 * - 完整 http(s) 链接：原样保留（兼容 CMS 里已填的完整地址 / 外部图床）
 * - 协议相对 //...：补成 https:
 * - 站点相对路径 /images/... 或 images/...：基于 Astro.site 拼成绝对地址
 *
 * 注意：文章封面、正文图片是「内容集合相对路径」（如 images/xxx.avif），
 * 构建后会被 Astro 优化改写到 /_astro/xxx.hash.avif，不能用本函数拼接，
 * 否则会生成坏链；这类图应先放进 public/ 再使用。
 */
export function toAbsoluteOgImage(
	raw?: string | null,
	site?: string | URL,
): string | undefined {
	const value = (raw ?? "").trim();
	if (!value) return undefined;
	if (/^https?:\/\//i.test(value)) return value;
	if (value.startsWith("//")) return `https:${value}`;

	const base = site ?? "https://www.3x3.top/";
	try {
		return new URL(value.replace(/^\/+/, ""), base).href;
	} catch {
		return undefined;
	}
}
