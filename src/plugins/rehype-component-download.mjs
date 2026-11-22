import { h } from "hastscript";
import I18nKey from "../i18n/i18nKey.ts";
import { i18n } from "../i18n/translation.ts";
import {
	dlAction,
	dlBody,
	dlCard,
	dlCodeChip,
	dlCover,
	dlCoverTag,
	dlCoverWrap,
	dlFoot,
	dlFootDesc,
	dlFootFree,
	dlFootLock,
	dlFootPay,
	dlMetaRow,
	dlNdDot,
	dlNdImg,
	dlNowBtn,
	dlPayBtn,
	dlPayLock,
	dlTagFree,
	dlTagLock,
	dlTagPay,
	dlTitle,
} from "../utils/download-styles.ts";
import {
	encodeDownloadUrl,
	encryptDownloadUrl,
	hashDownloadPassword,
	resolveDownloadCover,
} from "../utils/download-utils.ts";
import { dlAnchorId } from "../utils/download-anchor.ts";
import { resolveNetdisk } from "../utils/netdisk.ts";

/** 内联 SVG 图标（hast 环境无法使用 astro-icon，这里用轻量路径集） */
const ICON_PATHS = {
	download: "M12 3v10.2l3.6-3.6L17 11l-5 5-5-5 1.4-1.4 3.6 3.6V3zM5 19h14v2H5z",
	lock: "M12 2a4 4 0 0 1 4 4v2h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1V6a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v2h4V6a2 2 0 0 0-2-2z",
	zip: "M14 2H6v20h12V6zm-2 5l3 3-3 3-3-3zm-2 8h2v2h-2zm0 4h2v2h-2z",
	file: "M14 2H6v20h12V6zm-1 6V3.5L18.5 9z",
	image:
		"M21 3H3v18h18zm-2 16H5v-4.6l4-4 3 3 3.5-3.5L19 13zM8.5 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z",
	arrow: "M13 5l7 7-7 7v-4.5H4v-5h9V5z",
	key: "M12 2a5 5 0 0 1 4.6 3h-2.2A2.8 2.8 0 1 0 12 5c.6 0 1.2.2 1.7.5l-2 2H9.6l-1 1H7v1.6l-1.6 1.6H3v-3.5l6.3-6.3A5 5 0 0 1 12 2z",
};

/** 资源类型文案（站点以中文为主，此处不做多语言展开） */
const LABEL_FREE = "免费";
const LABEL_FREE_RES = "免费资源";
const LABEL_LOCK_RES = "加密资源";

function svgIcon(name, size = 20) {
	return h(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			width: String(size),
			height: String(size),
			fill: "currentColor",
			"aria-hidden": "true",
			style: "flex-shrink:0;display:block",
		},
		[h("path", { d: ICON_PATHS[name] })],
	);
}

/** 配置错误提示（插入正文方便排查） */
function usageHint(message) {
	return h("div", { class: "hidden" }, [`Invalid directive. (${message})`]);
}

/** 统一把属性值转为字符串 */
function asString(value) {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return "";
}

/** 规范化封面地址（与右栏卡片共用同一实现，避免两处规则漂移） */
const resolveCover = resolveDownloadCover;

/**
 * 网盘名（元信息行内的小圆点 + 名称）。
 * 仅品牌圆牌 / 自定义文字可展示名称；自定义图片展示小图标；无法识别则不展示。
 */
function netdiskInline(nd) {
	if (nd.kind === "badge" && nd.label) {
		return h("span", { class: "inline-flex items-center gap-1 min-w-0" }, [
			h("span", { class: dlNdDot, style: `background:${nd.color}` }),
			h("span", { class: "truncate" }, [nd.label]),
		]);
	}
	if (nd.kind === "img" && nd.src) {
		return h("span", { class: "inline-flex items-center min-w-0" }, [
			h("img", { class: dlNdImg, src: nd.src, alt: "", loading: "lazy" }),
		]);
	}
	if (nd.kind === "text" && nd.label) {
		return h("span", { class: "inline-flex items-center gap-1 min-w-0" }, [
			h("span", { class: dlNdDot, style: "background:var(--primary)" }),
			h("span", { class: "truncate" }, [nd.label]),
		]);
	}
	return null;
}

/**
 * 卡片外壳：左封面（带角标）+ 右侧标题/元信息/底部信息 + 最右操作按钮。
 * 普通 / 加密 / 付费三种卡片共用，仅传入内容与配色不同。
 */
function renderShell({ id, cover, tagText, tagClass, name, meta, foot, action }) {
	// 显式写 id 属性，而不是 "div#id" 选择器：锚点里可能含中文，
	// hastscript 的 CSS 选择器解析只认 ASCII，中文会解析失败。
	return h("div", { id, class: "not-prose my-4 scroll-mt-24" }, [
		h("div", { class: dlCard }, [
			h("div", { class: dlCoverWrap }, [
				h("img", { class: dlCover, src: cover, alt: "", loading: "lazy" }),
				tagText
					? h("span", { class: `${dlCoverTag} ${tagClass}` }, [tagText])
					: null,
			]),
			h("div", { class: dlBody }, [
				h("div", { class: dlTitle }, [
					h("span", { class: "truncate block" }, [name]),
				]),
				meta && meta.length ? h("div", { class: dlMetaRow }, meta) : null,
				foot && foot.length ? h("div", { class: dlFoot }, foot) : null,
			]),
			h("div", { class: dlAction }, [action]),
		]),
	]);
}

/**
 * 规范化指令属性：过滤非法数据并计算密码哈希。
 *
 * url 为空或不是 http(s)/相对路径时返回 null（防止 javascript: 之类的注入）。
 *
 * 属性名兼容两套写法（合并自 Fuwari 原有组件与 Firefly 下载按钮）：
 *   - 资源名：title（Fuwari 原有）或 name
 *   - 简介：desc 或 source（Fuwari 原有）
 *   - 另支持：size（大小）/ code（网盘提取码）/ hint（密码提示）
 *             / password（访问密码）/ icon（图标类型）/ cover（封面图）
 *             / tag（角标文案）
 */
function normalizeItem(props) {
	const url = asString(props.url).trim();
	if (!url) return null;

	const isSafeUrl =
		/^https?:\/\//i.test(url) ||
		url.startsWith("/") ||
		url.startsWith("./") ||
		url.startsWith("../");
	if (!isSafeUrl) return null;

	const password = asString(props.password).trim();
	const desc = asString(props.desc).trim();
	const source = asString(props.source).trim();
	const size = asString(props.size).trim();
	const code = asString(props.code).trim();
	const hint = asString(props.hint).trim();
	const icon = asString(props.icon).trim();
	const cover = asString(props.cover).trim();
	const tag = asString(props.tag).trim();
	const rawName =
		asString(props.name).trim() ||
		asString(props.title).trim() ||
		asString(props.source).trim();
	const name = rawName || i18n(I18nKey.downloadAction);

	return {
		name,
		rawName,
		url,
		desc: desc || source,
		size,
		code,
		hint,
		icon,
		cover,
		tag,
		hash: password ? hashDownloadPassword(password) : "",
		// 有访问密码时，用密码派生的密钥加密地址：页面源码里连 Base64 都没有，
		// 用户输入正确密码后前端才解密出真实地址。
		encrypted: password ? encryptDownloadUrl(url, password) : "",
	};
}

/**
 * 付费资源卡片（::download{pay="..." buy="..." price="..."}）
 *
 * 真实下载地址 / 卡密只放在第三方发卡平台的商品发货内容里，
 * 本卡片不输出任何 url / password / code / 密文，因此公开的 GitHub 仓库、
 * HTML、RSS、接口里都不会出现付费资源。
 */
function renderPayCard(props) {
	const buy = asString(props.buy).trim();
	if (!/^https?:\/\//i.test(buy)) {
		return usageHint(
			'"buy" is required for pay downloads and must be an http(s) URL',
		);
	}

	const name =
		asString(props.title).trim() ||
		asString(props.name).trim() ||
		"付费资源";
	const desc = asString(props.desc).trim() || asString(props.source).trim();
	const size = asString(props.size).trim();
	const price = asString(props.price).trim();
	const cover = resolveCover(asString(props.cover).trim());
	const buyText =
		asString(props.buyText).trim() ||
		(price ? `立即购买 · ¥${price}` : "立即购买");

	const id = dlAnchorId(
		asString(props.name).trim() ||
			asString(props.title).trim() ||
			asString(props.source).trim(),
	);

	const meta = [h("span", { class: dlPayLock }, [svgIcon("lock", 12), "付费资源"])];
	if (size) meta.push(h("span", { class: "shrink-0" }, [size]));

	const foot = [h("span", { class: dlFootPay }, ["付费资源"])];
	if (desc) {
		foot.push(h("span", { class: dlFootDesc, title: desc }, [desc]));
	}

	const action = h(
		"a",
		{
			class: dlPayBtn,
			href: buy,
			target: "_blank",
			rel: "noopener noreferrer",
			"data-dl-pay": asString(props.pay).trim() || "1",
		},
		[svgIcon("arrow", 16), h("span", {}, [buyText])],
	);

	return renderShell({
		id,
		cover,
		tagText: "付费",
		tagClass: dlTagPay,
		name,
		meta,
		foot,
		action,
	});
}

export function DownloadComponent(props, children) {
	if (Array.isArray(children) && children.length !== 0) {
		return usageHint(
			'"download" directive must be leaf type ::download{title="..." url="..."}',
		);
	}

	// 付费资源：地址与卡密只存在发卡平台，页面不输出任何 url / 密码 / 密文
	if (asString(props?.pay).trim() || asString(props?.buy).trim()) {
		return renderPayCard(props ?? {});
	}

	const item = normalizeItem(props ?? {});
	if (!item) {
		return usageHint(
			'"url" is required and must be an http(s) or relative path',
		);
	}

	const uuid = dlAnchorId(item.rawName);
	const lock = Boolean(item.hash);
	const nd = resolveNetdisk(item.icon, item.url);

	/* 元信息行：网盘名 · 提取码（可点击复制）· 大小 */
	const meta = [];
	const ndEl = netdiskInline(nd);
	if (ndEl) meta.push(ndEl);
	if (item.code) {
		meta.push(
			h(
				"button",
				{
					type: "button",
					class: dlCodeChip,
					"data-dl-code": item.code,
					"data-dl-code-copied": i18n(I18nKey.downloadCodeCopied),
					title: `${i18n(I18nKey.downloadCode)}: ${item.code}`,
				},
				[
					svgIcon("key", 12),
					h("span", { "data-dl-code-text": true }, [
						`${i18n(I18nKey.downloadCode)}：${item.code}`,
					]),
				],
			),
		);
	}
	if (item.size) meta.push(h("span", { class: "shrink-0" }, [item.size]));

	/* 底部行：资源类型（免费/加密）+ 简介 */
	const foot = [
		h("span", { class: lock ? dlFootLock : dlFootFree }, [
			lock ? LABEL_LOCK_RES : LABEL_FREE_RES,
		]),
	];
	if (item.desc) {
		foot.push(h("span", { class: dlFootDesc, title: item.desc }, [item.desc]));
	}

	/* 右侧：立即下载（加密时点击弹出密码框，由 DownloadSupport 接管） */
	const action = h(
		"button",
		{
			type: "button",
			class: dlNowBtn,
			// 有密码 → 加密后的密文（前端解密）；无密码 → Base64 混淆
			"data-dl-url": item.encrypted || encodeDownloadUrl(item.url),
			"data-dl-enc": item.encrypted ? "1" : "",
			"data-dl-name": item.name,
			"data-dl-hash": item.hash,
			"data-dl-hint": item.hint ?? "",
			"data-dl-title": i18n(I18nKey.downloadUnlockTitle),
			"data-dl-desc": i18n(I18nKey.downloadUnlockDesc),
			"data-dl-placeholder": i18n(I18nKey.passwordPlaceholder),
			"data-dl-submit": i18n(I18nKey.downloadUnlockSubmit),
			"data-dl-cancel": i18n(I18nKey.downloadCancel),
			"data-dl-error": i18n(I18nKey.downloadUnlockError),
			"data-dl-hint-label": i18n(I18nKey.passwordHint),
		},
		[svgIcon("download", 16), h("span", {}, [i18n(I18nKey.downloadNow)])],
	);

	const tagText = item.tag || (lock ? i18n(I18nKey.downloadLocked) : LABEL_FREE);
	const tagClass = lock ? dlTagLock : dlTagFree;

	return renderShell({
		id: uuid,
		cover: resolveCover(item.cover),
		tagText,
		tagClass,
		name: item.name,
		meta,
		foot,
		action,
	});
}
