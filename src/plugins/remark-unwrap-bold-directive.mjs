import { visit } from "unist-util-visit";

/**
 * 还原被加粗包住的指令
 *
 * 从 Word / 微信公众号 / 富文本编辑器整段粘贴时，每一行常被套上 ** 加粗：
 *
 *   **::download{name="..." url="..."}**
 *
 * Markdown 解析时 `**` 先构成 emphasis，整行变成一个普通加粗段落，
 * 里面的 `::download{...}` 不再是指令 → 页面上直接显示这串源码，
 * 或者落到组件的「Invalid directive」兜底提示。
 *
 * 这里在指令解析之后做一次还原：段落唯一子节点是 strong、且其纯文本
 * 恰好是一条 `::名称{属性}` 时，把整段替换成 leafDirective 节点。
 * 代码块里的示例（inlineCode / code）不是 strong，不会被误改。
 */

const DIRECTIVE = /^::([a-zA-Z][\w-]*)\{([\s\S]*)\}$/;
const ATTR =
	/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|“([^”]*)”|‘([^’]*)’)/g;

/** 取出匹配到的属性值（四种引号任选其一） */
function attrValue(match) {
	for (let i = 2; i <= 5; i++) {
		if (match[i] !== undefined) return match[i];
	}
	return "";
}

/**
 * 把 `name="a" url="b"` 解析成属性对象
 *
 * 支持四种引号：英文直引号、中文弯引号。这是因为 Astro 的排版转换
 * （smartypants）会把正文里被加粗包住的直引号变成弯引号，
 * 属性值以文本节点形式存在，到这里已经是弯的了。
 */
function parseAttributes(raw) {
	const attributes = {};
	let match = ATTR.exec(raw);
	while (match !== null) {
		attributes[match[1]] = attrValue(match);
		match = ATTR.exec(raw);
	}
	ATTR.lastIndex = 0;
	return attributes;
}

/**
 * strong 节点里的纯文本
 *
 * 软换行折成空格；裸 URL 会被 GFM 自动识别成链接节点（link），
 * 这里取回链接地址，避免因为「不是纯 text」而整行放弃还原。
 */
function strongText(node) {
	let text = "";
	for (const child of node.children) {
		if (child.type === "text") text += child.value;
		else if (child.type === "break") text += " ";
		else if (child.type === "link") text += child.url;
		else return "";
	}
	return text.trim();
}

export function remarkUnwrapBoldDirective() {
	return (tree) => {
		visit(tree, "paragraph", (node, index, parent) => {
			if (!parent || index === undefined) return;
			if (node.children.length !== 1) return;

			const strong = node.children[0];
			if (strong.type !== "strong") return;

			const text = strongText(strong);
			const match = DIRECTIVE.exec(text);
			if (!match) return;

			const [, name, rawAttrs] = match;
			const attributes = parseAttributes(rawAttrs);
			if (Object.keys(attributes).length === 0) return;

			parent.children[index] = {
				type: "leafDirective",
				name,
				attributes,
				children: [],
				position: node.position,
			};
		});
	};
}
