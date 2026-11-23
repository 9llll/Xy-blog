/**
 * 把 frontmatter 里的「下载资源」表单，还原成正文里的 ::download 卡片
 *
 * 背景：::download{...} 指令参数多、引号容易漏，在 Pages CMS 里手打既记不住
 * 也容易错。因此给文章 frontmatter 增加两个扁平字段：
 *   downloadLinks —— 多行文本，一行一个网盘，竖线分隔
 *   downloadHint  —— 可选，全篇统一的密码获取方式
 *
 * 为什么用「多行文本」而不是「对象列表」：Pages CMS 的 object + list:true
 * 嵌套字段在本站实例上不渲染（编辑页看不到任何输入位置），而 text/string
 * 这类基础字段稳定可用。因此改用「一行一条、竖线分隔」的纯文本，
 * 兼顾「能填」和「不用记指令语法」。
 *
 * 每行格式（后三段可省略）：
 *   名称 | 链接 | 提取码 | 访问密码 | 文件大小
 *
 * 处理时机：插进来的节点会被随后的 remarkDirective / parseDirectiveNode
 * 当成真正的 leafDirective，交给 rehype-component-download 渲染成卡片，
 * 与正文手写 ::download{} 走完全相同的链路（样式、密码加密、侧栏总览一致）。
 *
 * 优先级：正文已经写了 ::download{} 的文章忽略 frontmatter 表单，
 * 避免同一张卡片渲染两遍，因此现有文章无需迁移。
 */
import { SKIP, visit } from "unist-util-visit";

/** 表单字段名：作者填写的下载资源清单（多行文本） */
export const FRONTMATTER_DOWNLOAD_KEY = "downloadLinks";
/** 表单字段名：全篇统一的密码获取方式 */
export const FRONTMATTER_HINT_KEY = "downloadHint";

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

const URL_RE = /https?:\/\/[^\s|｜]+/i;
/** 形如 519 MB / 6.1 GB / 800KB */
const SIZE_RE = /^\d+(?:\.\d+)?\s*(?:[KMGT]B?|字节)$/i;
/** 「提取码：xxx」「密码=xxx」这类前缀 */
const LABEL_RE =
	/^\s*(?:提取码|提取碼|访问密码|訪問密碼|密码|密碼|解压密码|解壓密碼|code|password|pwd|size|大小|文件大小)\s*[:：=]\s*/i;

/** 去掉「提取码：」这类说明性前缀，只留值 */
function stripLabel(text) {
	return String(text).replace(LABEL_RE, "").trim();
}

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

/**
 * 一行文本 → 指令属性；无效行返回 null
 * 容错点：
 *   - 全角竖线 ｜ 与半角 | 等价
 *   - 链接不在第二列时，按「整行第一个 http 地址」兜底，名称里混入的链接会被剔除
 *   - 形如 519 MB 的值优先落到 size，不会被误当成提取码
 *   - 支持「提取码：xxx」这种带前缀的写法
 */
export function lineToAttributes(line) {
	const raw = String(line ?? "").trim();
	if (!raw || raw.startsWith("#")) return null;

	const parts = raw.split(/[|｜]/).map((s) => s.trim());
	let name = parts[0] ?? "";
	let rest = parts.slice(1);

	// 链接：优先在后续列里找；找不到再从整行提取
	let url = "";
	const urlIdx = rest.findIndex((s) => /^https?:\/\//i.test(s));
	if (urlIdx >= 0) {
		url = rest[urlIdx].match(URL_RE)?.[0] ?? "";
		rest = rest.slice(urlIdx + 1);
	} else {
		url = raw.match(URL_RE)?.[0] ?? "";
		if (url) name = name.replace(URL_RE, "").trim();
	}
	if (!url) return null;

	const attributes = { url };

	name = stripLabel(name);
	if (name) attributes.name = name;

	const slots = ["code", "password"];
	for (const piece of rest) {
		const value = stripLabel(piece);
		if (!value) continue;
		if (!attributes.size && SIZE_RE.test(value)) {
			attributes.size = value;
			continue;
		}
		for (const slot of slots) {
			if (attributes[slot]) continue;
			attributes[slot] = value;
			break;
		}
	}

	return attributes;
}

/** 多行文本 → 属性数组 */
export function parseDownloadText(text) {
	if (typeof text !== "string") return [];
	return text
		.split(/\r?\n/)
		.map(lineToAttributes)
		.filter(Boolean);
}

/** 把一条旧格式（对象）记录转成指令属性；无效记录返回 null */
function objectToAttributes(item) {
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
	if (attributes.buy && !attributes.pay) attributes.pay = "1";

	return attributes;
}

export default function remarkFrontmatterDownloads() {
	return (tree, file) => {
		const frontmatter = file?.data?.astro?.frontmatter ?? {};
		const raw = frontmatter[FRONTMATTER_DOWNLOAD_KEY];
		if (!raw) return;
		if (hasBodyDirective(tree)) return;

		let list = [];
		if (typeof raw === "string") {
			list = parseDownloadText(raw);
		} else if (Array.isArray(raw)) {
			// 兼容两种历史写法：字符串数组 / 对象数组
			list = raw
				.map((item) =>
					typeof item === "string" ? lineToAttributes(item) : objectToAttributes(item),
				)
				.filter(Boolean);
		}
		if (list.length === 0) return;

		const hintRaw = frontmatter[FRONTMATTER_HINT_KEY];
		const hint = typeof hintRaw === "string" ? hintRaw.trim() : "";

		const nodes = list.map((attributes) => {
			const attrs = { ...attributes };
			if (hint && !attrs.hint) attrs.hint = hint;
			return {
				type: "leafDirective",
				name: "download",
				attributes: attrs,
				children: [],
			};
		});

		// 插到正文最前面：表单里的资源通常是文章的主角，卡片应排在最上方
		tree.children.unshift(...nodes);
	};
}
