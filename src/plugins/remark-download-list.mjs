import { visit } from "unist-util-visit";
import { dlAnchorId } from "../utils/download-anchor.ts";
import { resolveNetdisk } from "../utils/netdisk.ts";

/**
 * 收集文章内的下载资源清单
 *
 * 遍历 Markdown AST 中的 `::download{}` 指令，把「可公开展示」的元信息
 * （资源名、大小、网盘、类型、价格、封面）写进
 * `frontmatter.downloads`，供文章页顶部资源卡与右侧栏「下载地址」卡使用。
 *
 * 安全性：这里**刻意不输出** url / password / code 以及加密密文。
 * 真实地址仍只存在于正文卡片（加密时是密文）与发卡平台，
 * 侧栏卡片只做锚点跳转或外链购买页，避免多一条泄露面。
 *
 * 用 AST 而不是正则匹配原文，可以天然排除代码块里的示例写法
 * （download-guide.md 里的 ```::download{...}``` 不会被统计）。
 *
 * 副作用：同时写入 `hasDownload` / `hasPayDownload`，避免其他插件重复遍历。
 */
export function remarkDownloadList() {
	return (tree, { data }) => {
		const list = [];

		visit(tree, (node) => {
			if (
				node.type !== "leafDirective" &&
				node.type !== "textDirective" &&
				node.type !== "containerDirective"
			) {
				return;
			}
			if (node.name !== "download") return;

			const attrs = node.attributes ?? {};
			const str = (key) => {
				const v = attrs[key];
				return typeof v === "string" ? v.trim() : "";
			};

			const url = str("url");
			const buy = str("buy");
			const isPay = Boolean(str("pay")) || Boolean(buy);
			const password = str("password");

			// 非法指令（既没有 url 也没有 buy）由 rehype 阶段渲染成提示，这里跳过
			if (!isPay && !url) return;

			const rawName = str("name") || str("title") || str("source");
			const name = rawName || (isPay ? "付费资源" : "下载资源");
			const size = str("size");
			const price = str("price");
			const desc = str("desc") || str("source");
			const icon = str("icon");
			const cover = str("cover");
			const tag = str("tag");

			const nd = isPay ? null : resolveNetdisk(icon, url);

			list.push({
				/** 与正文卡片一致的锚点 id（两边都用「原始资源名」推导，空名统一回落 dl-res） */
				key: dlAnchorId(rawName),
				name,
				desc,
				size,
				price,
				tag,
				/** free | lock | pay */
				kind: isPay ? "pay" : password ? "lock" : "free",
				/** 网盘品牌信息（仅品牌名与色值，不含地址） */
				netdisk: nd
					? { label: nd.label ?? "", color: nd.color ?? "", src: nd.src ?? "", kind: nd.kind }
					: null,
				/** 仅当作者显式指定封面时才带出，避免侧栏加载一堆默认图 */
				cover: cover || "",
				/** 付费资源的外链购买页（本身就是公开页面） */
				buy: isPay ? buy : "",
			});
		});

		data.astro.frontmatter.hasDownloadList = list.length > 0;
		if (list.length > 0) {
			data.astro.frontmatter.downloads = list;
		}
	};
}
