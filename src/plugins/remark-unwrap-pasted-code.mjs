import { SKIP, visit } from "unist-util-visit";

/**
 * 兜底：把「整段中文正文被无语言标识的代码块包住」还原成普通段落。
 *
 * 起因：PagesCMS 里粘贴正文后保存，偶尔会把段落写成
 *   ```
 *   正文第一段……
 *   ```
 * 渲染出来就是一个带 PLAINTEXT 标签、带行号的代码块。
 * 这里只在内容明显是中文散文时才拆，真正的代码块（含 {} ; = # 等符号、
 * 多行配置、带语言的块）一律不动。
 */

// 出现这些符号基本可以断定不是散文
const CODE_SYMBOLS = /[{};=#$:\\<>|()[\]`~&→•]/;

const CJK = /[\u4e00-\u9fa5]/g;

function looksLikeProse(value) {
	if (!value) return false;
	if (value.split("\n").length > 4) return false; // 多行多半是代码或 ASCII 排版
	if (CODE_SYMBOLS.test(value)) return false;

	const cjk = (value.match(CJK) || []).length;
	if (cjk < 60) return false;

	const visible = value.replace(/\s/g, "").length;
	return visible > 0 && cjk / visible >= 0.5;
}

export function remarkUnwrapPastedCode() {
	return (tree) => {
		visit(tree, "code", (node, index, parent) => {
			if (!parent || typeof index !== "number") return;
			if (node.lang) return;
			if (!looksLikeProse(node.value)) return;

			const blocks = node.value
				.split(/\n\s*\n/)
				.map((block) => block.trim())
				.filter(Boolean);

			const paragraphs = blocks.map((block) => ({
				type: "paragraph",
				children: [{ type: "text", value: block.replace(/\n/g, " ") }],
			}));

			parent.children.splice(index, 1, ...paragraphs);
			return [SKIP, index + paragraphs.length];
		});
	};
}
