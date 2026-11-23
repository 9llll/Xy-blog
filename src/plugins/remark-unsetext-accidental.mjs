/**
 * 拦截「粘贴带来的长虚线」被误判成二级标题
 *
 * 触发条件（三条同时成立才处理）：
 *   1. 节点是 heading，depth === 2
 *   2. 它在源码里至少占两行（setext 写法：文字行 + 下划线行；连续多行文字会被
 *      整段并进同一个标题，所以这里是「两行及以上」而不是「恰好两行」）
 *   3. 最后一行是 10 个以上的连续半角连字符（允许行首尾空白）
 *
 * 为什么会有这个问题：从 Word / 微信 / 富文本复制正文时，章节之间常带一条
 * 由几十个「-」拼出的装饰横线，粘进来紧贴上一行文字、中间没有空行。
 * Markdown 的 setext 标题语法正是「文字行 + 一行 -」，于是整段正文被
 * 逐个升级成 h2，页面上表现为正文字号突然变大、行距异常。
 *
 * 为什么不拦 3~9 个连字符：手写 setext 标题通常就写 3 个，那是作者的真实意图；
 * 几十个连字符只能是复制带来的装饰线，两者用长度可以干净区分（本项目全部
 * 文章实测：装饰线最短 21 个，手写 setext 用量为 0）。
 *
 * 处理方式：把该 heading 就地降级为普通段落，虚线行随之丢弃。
 * 不新增空行、不改动其它节点，因此不会影响上下文的段落归属。
 */
import { visit } from "unist-util-visit";

/** 判定为「粘贴装饰线」的最短连字符数量 */
const DECORATIVE_MIN_LENGTH = 10;

/** 整行只由连字符构成（允许首尾空白） */
const RULE_LINE = new RegExp(`^[ \t]*-{${DECORATIVE_MIN_LENGTH},}[ \t]*$`);

export default function remarkUnsetextAccidental() {
	return (tree, file) => {
		const source = typeof file?.value === "string" ? file.value : "";
		if (!source) return;

		visit(tree, "heading", (node, index, parent) => {
			if (node.depth !== 2) return;
			if (!parent || typeof index !== "number") return;

			const start = node.position?.start?.offset;
			const end = node.position?.end?.offset;
			if (typeof start !== "number" || typeof end !== "number") return;

			const lines = source.slice(start, end).split(/\r?\n/);
			// 连续几行文字 + 一行虚线时，CommonMark 会把整段文字并进这个标题，
			// 所以不能要求「恰好两行」，只要最后一行是装饰线即可。
			if (lines.length < 2) return;
			if (!RULE_LINE.test(lines[lines.length - 1])) return;

			parent.children[index] = {
				type: "paragraph",
				children: node.children,
				position: node.position,
			};
			return "skip";
		});
	};
}
