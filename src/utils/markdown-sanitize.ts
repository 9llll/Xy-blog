/**
 * 对外输出（RSS / JSON 接口）前的正文脱敏
 *
 * 背景：RSS 与 /api/[id].json 直接用 markdown-it 渲染**原始 markdown**，
 * 不会经过站内的自定义指令组件，于是
 *
 *   ::download{url="https://pan.baidu.com/s/xxx" password="8888" code="9jd4"}
 *
 * 会被当成普通文本原样输出，下载地址、访问密码、提取码全部泄露到公开的
 * RSS / 接口里（页面上是 Base64 + 密码哈希，相对安全）。
 *
 * 这里在渲染之前把自定义指令替换成安全的纯文本：
 *   - ::download → 提示前往原文，不含任何地址 / 密码 / 提取码
 *   - ::btn      → 只保留按钮文字，去掉 href
 *   - ::video    → 只保留标题，去掉 src
 *   - 容器指令（::note / ::gallery 等）→ 只去掉标记，保留正文
 */

/** 任何情况下都不能出现在对外输出里的属性 */
const SENSITIVE_ATTRS = new Set([
	"url",
	"href",
	"src",
	"password",
	"code",
	"hash",
	"key",
	"token",
	"secret",
]);

/** 解析 name="value" 形式的属性 */
function parseAttrs(raw: string): Record<string, string> {
	const out: Record<string, string> = {};
	const re = /([A-Za-z][\w-]*)\s*=\s*"([^"]*)"/g;
	let m: RegExpExecArray | null = re.exec(raw);
	while (m) {
		out[m[1]] = m[2];
		m = re.exec(raw);
	}
	return out;
}

/** 取第一个非空的属性值 */
function pick(attrs: Record<string, string>, ...keys: string[]): string {
	for (const k of keys) {
		const v = attrs[k];
		if (v) return v;
	}
	return "";
}

/** 把一个自定义指令转成可安全展示的纯文本 */
function directiveToText(name: string, rawAttrs: string): string {
	const attrs = parseAttrs(rawAttrs);

	switch (name) {
		case "download":
			return attrs.pay || attrs.buy
				? "💰 付费资源：购买方式与下载地址请前往原文查看"
				: "🔒 资源下载：下载地址 / 提取码 / 访问密码请前往原文查看";
		case "btn": {
			const text = pick(attrs, "text", "title");
			return text ? `链接：${text}` : "链接";
		}
		case "video": {
			const title = pick(attrs, "title");
			return title ? `视频：${title}` : "视频";
		}
		case "post":
			return "站内文章卡片";
		case "github":
			return "GitHub 仓库卡片";
		case "gallery":
			return "";
		default: {
			// 未知指令：只保留非敏感属性
			const keep = Object.entries(attrs).filter(
				([k]) => !SENSITIVE_ATTRS.has(k.toLowerCase()),
			);
			return keep.length
				? keep.map(([k, v]) => `${k}：${v}`).join("，")
				: "";
		}
	}
}

/**
 * 把正文里的自定义指令替换为安全文本。
 * 传入原始 markdown，返回可以直接交给 markdown-it 渲染的内容。
 */
export function sanitizeMarkdownForFeed(markdown: string): string {
	const out: string[] = [];

	for (const line of markdown.split("\n")) {
		const trimmed = line.trim();

		// 容器指令的开始标记（::note / ::tip / ::gallery ...）
		if (/^::[A-Za-z][\w-]*$/.test(trimmed)) continue;
		// 容器指令的结束标记
		if (trimmed === "::") continue;

		// 独占一行的叶子指令
		const leaf = trimmed.match(/^::([A-Za-z][\w-]*)\s*\{([\s\S]*)\}\s*$/);
		if (leaf) {
			const text = directiveToText(leaf[1], leaf[2]);
			if (text) out.push(text);
			continue;
		}

		// 行内指令
		out.push(
			line.replace(
				/::([A-Za-z][\w-]*)\s*\{([\s\S]*?)\}/g,
				(_m, name: string, attrs: string) => directiveToText(name, attrs),
			),
		);
	}

	return out.join("\n");
}
