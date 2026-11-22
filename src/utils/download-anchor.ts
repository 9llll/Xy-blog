/**
 * 下载卡片的锚点 id
 *
 * 正文里的 `::download{}` 卡片需要有一个稳定的 id，
 * 右侧栏「下载地址」列表用同一个 id 做锚点跳转。
 *
 * 为什么不用计数器：remark 插件与 rehype 插件是两个独立的执行阶段，
 * 跨阶段共享计数器在并发构建多个页面时会串号。这里改为「由资源名推导」，
 * 两个阶段拿到同样的输入就能算出同样的 id，不依赖任何全局状态。
 *
 * 注意：保留中文（HTML5 允许），只把空白/标点压成连字符。
 */
/** 网盘品牌信息（只含展示字段，不含地址） */
export interface DownloadNetdiskInfo {
	label?: string;
	color?: string;
	src?: string;
	kind?: string;
}

/**
 * remark-download-list 收集出的单条资源
 * （与正文卡片通过 key 锚点对应；刻意不含 url / password / code）
 */
export interface DownloadListItem {
	key: string;
	name: string;
	desc?: string;
	size?: string;
	price?: string;
	tag?: string;
	kind: "free" | "lock" | "pay";
	netdisk?: DownloadNetdiskInfo | null;
	cover?: string;
	buy?: string;
}

export function dlAnchorId(rawName: string): string {
	const base = String(rawName ?? "")
		.trim()
		.toLowerCase()
		// 保留字母、数字、汉字、连字符；其余（空格、标点、emoji）统一压成连字符
		.replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);

	return `dl-${base || "res"}`;
}
