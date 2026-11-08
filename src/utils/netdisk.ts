/**
 * 网盘品牌图标注册表
 *
 * - 内置常用网盘的品牌色 + 中文名，渲染为品牌色圆牌
 * - 支持按下载链接域名自动识别（pan.baidu.com → 百度 等）
 * - 支持自定义：icon 填图片地址渲染 <img>，填 emoji/文字渲染文字
 *
 * 解析优先级（见 resolveNetdisk）：
 *   1. 显式网盘关键字（baidu/quark…）→ 品牌圆牌
 *   2. 自定义图片地址 / emoji 文字 → img / text
 *   3. 按链接域名自动识别（覆盖弱通用图标 zip/file…）
 *   4. 通用文件类型图标（zip/file/image/lock/key）
 *   5. 兜底 download
 */

export type NetdiskKind = "svg" | "badge" | "img" | "text";

export interface NetdiskInfo {
	label: string;
	color: string;
}

export interface NetdiskResult {
	kind: NetdiskKind;
	key?: string;
	label?: string;
	color?: string;
	src?: string;
	name?: string;
}

/** 网盘 → 品牌色圆牌（标签 + 颜色） */
export const NETDISK: Record<string, NetdiskInfo> = {
	baidu: { label: "百度", color: "#2932E1" },
	quark: { label: "夸克", color: "#7C5CFF" },
	aliyun: { label: "阿里云", color: "#FF6A00" },
	"123": { label: "123", color: "#1E9FFF" },
	lanzou: { label: "蓝奏云", color: "#2D8CF0" },
	tianyi: { label: "天翼云", color: "#1664FF" },
	xunlei: { label: "迅雷", color: "#2BB0E8" },
	chengtong: { label: "城通", color: "#FF7A1A" },
	cowtransfer: { label: "奶牛", color: "#00C18C" },
	weiyun: { label: "微云", color: "#1AAD19" },
	"360": { label: "360", color: "#FF7A00" },
	"115": { label: "115", color: "#FF9A00" },
	pikpak: { label: "PikPak", color: "#00C2FF" },
};

/** 弱通用图标：被网盘自动识别覆盖，但非网盘链接时仍可用 */
const GENERIC_ICONS = new Set([
	"download",
	"lock",
	"zip",
	"rar",
	"archive",
	"image",
	"photo",
	"picture",
	"file",
	"doc",
	"key",
]);

/** 域名 → 网盘（子串匹配，足够覆盖常见网盘） */
const DOMAIN_MAP: [RegExp, string][] = [
	[/baidu\.com/i, "baidu"],
	[/quark\.cn/i, "quark"],
	[/aliyun/i, "aliyun"],
	[/123(pan|684)?\.(com|cn)/i, "123"],
	[/lanzou/i, "lanzou"],
	[/cloud\.189\.cn|tianyi/i, "tianyi"],
	[/xunlei/i, "xunlei"],
	[/chenct|chengtong|ctfile/i, "chengtong"],
	[/cowtransfer|wntransfer/i, "cowtransfer"],
	[/weiyun/i, "weiyun"],
	[/yunpan\.360|360\.cn/i, "360"],
	[/115(pan)?\.(com|cn)/i, "115"],
	[/pikpak/i, "pikpak"],
];

/** 按下载链接域名识别网盘，返回注册表 key */
export function detectNetdisk(url?: string): string | null {
	if (!url) return null;
	for (const [re, key] of DOMAIN_MAP) {
		if (re.test(url)) return key;
	}
	return null;
}

/**
 * 解析下载组件的图标表现。
 * @param icon 指令 icon 属性（可能为空 / 网盘关键字 / 通用图标 / 图片URL / emoji文字）
 * @param url  下载地址（用于自动识别网盘）
 */
export function resolveNetdisk(icon?: string, url?: string): NetdiskResult {
	const raw = (icon ?? "").trim();
	const lower = raw.toLowerCase();

	// 1. 显式网盘关键字 → 品牌圆牌
	if (NETDISK[lower]) {
		return { kind: "badge", key: lower, ...NETDISK[lower] };
	}
	// 2. 自定义图片地址
	if (
		/^https?:\/\//i.test(raw) ||
		(/^\//.test(raw) && /\.(svg|png|jpe?g|webp|gif|avif|ico)$/i.test(raw))
	) {
		return { kind: "img", src: raw };
	}
	// 3. 自定义文字 / emoji（非内置通用图标）
	if (raw && !GENERIC_ICONS.has(lower)) {
		return { kind: "text", label: raw };
	}
	// 4. 按链接域名自动识别网盘（覆盖弱通用图标 zip/file…）
	const detected = detectNetdisk(url);
	if (detected) {
		return { kind: "badge", key: detected, ...NETDISK[detected] };
	}
	// 5. 通用文件类型图标
	if (GENERIC_ICONS.has(lower)) {
		return { kind: "svg", name: lower };
	}
	// 6. 兜底
	return { kind: "svg", name: "download" };
}
