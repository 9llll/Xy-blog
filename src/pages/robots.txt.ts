import type { APIRoute } from "astro";

/**
 * robots.txt
 *
 * 注意不要 Disallow /_astro/：那里是本站的 CSS / JS / 字体，
 * 屏蔽后搜索引擎无法抓取渲染所需的样式与脚本，会直接影响页面质量评估
 * （Google 官方明确不建议屏蔽 CSS/JS 资源）。
 *
 * /api/ 是给外部程序读的 JSON 端点，与页面内容重复且无需收录，屏蔽；
 * /search/ 是站内搜索结果页，参数组合无限，同样不收录。
 */
const robotsTxt = `
User-agent: *
Allow: /
Disallow: /api/
Disallow: /search/

Sitemap: ${new URL("sitemap-index.xml", import.meta.env.SITE).href}
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
