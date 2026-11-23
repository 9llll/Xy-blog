/**
 * 把 frontmatter 里的「下载资源」表单，还原成正文里的 ::download 卡片
 *
 * 背景：::download{...} 指令参数多、引号容易漏、不同网盘的属性写法不一致，
 * 在 Pages CMS 的源码框里手打既记不住也容易错。因此给文章 frontmatter 增加
 * 一个结构化字段 downloadLinks，由 Pages CMS 渲染成「一行一个资源」的表单，
 * 作者只需要填空 / 下拉选择，不再接触指令语法。
 *
 * 处理时机：插在这个插件里的节点，会被随后的 remarkDirective / parseDirectiveNode
 * 当成真正的 leafDirective 处理，最终交给 rehype-component-download 渲染成卡片，
 * 与正文手写 ::download{} 走完全相同的链路，因此样式、密码加密、锚点都一致。
 *
 * 优先级规则（重要）：
 *   正文已经写了 ::download{} 的文章，忽略 frontmatter 表单，避免同一张卡片渲染两遍。
 *   这样现有文章无需迁移，新文章可以直接用表单。
 */
import { SKIP, visit } from "unist-util-visit";

/** 表单字段名：作者填写的下载资源清单 */
export const FRONTMATTER_DOWNLOAD_KEY = "downloadLinks";

/** 只允许这些属性进入指令，防止表单里混入任意字段 */
const ALLOWED_ATTRS = new Set([
	"name",
	"url",
	"code",
	"password",
	"size",
	"icon",
	"hint",
	"cover",
	"tag",
	"desc",
	"pay",
	"buy",
	"price",
	"buyText",
]);

/** 正文里是否已经有手写的 download 指令 */
function hasBodyDirective(tree) {
	let found = false;
	visit(tree, (node) => {
		if (found) return SKIP;
		if (
			(node.type === "leafDirective" ||
				node.type === "textDirective" ||
				node.type === "containerDirective") &&
			node.name === "download"
		) {
			found = true;
			return SKIP;
		}
	});
	return found;
}

/** 把一条表单记录转成指令属性；无效记录返回 null */
function toAttributes(item) {
	if (!item || typeof item !== "object") return null;

	const attributes = {};
	for (const [key, value] of Object.entries(item)) {
		if (!ALLOWED_ATTRS.has(key)) continue;
		if (value === null || value === undefined) continue;
		const text = typeof value === "boolean" ? String(value) : String(value).trim();
		if (!text) continue;
		attributes[key] = text;
	}

	// 付费卡片认 buy，普通卡片认 url；两者都没有则这条记录无效
	if (!attributes.url && !attributes.buy) return null;
	// 付费标记：pay 为空字符串时也要保留语义
	if (attributes.buy && !attributes.pay) attributes.pay = "1";

	return attributes;
}

export default function remarkFrontmatterDownloads() {
	return (tree, file) => {
		const frontmatter = file?.data?.astro?.frontmatter ?? {};
		const list = frontmatter[FRONTMATTER_DOWNLOAD_KEY];
		if (!Array.isArray(list) || list.length === 0) return;
		if (hasBodyDirective(tree)) return;

		const nodes = [];
		for (const item of list) {
			const attributes = toAttributes(item);
			if (!attributes) continue;
			nodes.push({
				type: "leafDirective",
				name: "download",
				attributes,
				children: [],
			});
		}
		if (nodes.length === 0) return;

		// 插到正文最前面：表单里的资源通常是文章的主角，卡片应排在最上方
		tree.children.unshift(...nodes);
	};
}
