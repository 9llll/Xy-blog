import { h } from "hastscript";
import I18nKey from "../i18n/i18nKey.ts";
import { i18n } from "../i18n/translation.ts";
import {
	dlAction,
	dlBody,
	dlBuyBtn,
	dlCard,
	dlCodeChip,
	dlCover,
	dlCoverTag,
	dlCoverWrap,
	dlFoot,
	dlFootFree,
	dlFootKind,
	dlFootLock,
	dlMetaRow,
	dlNdDot,
	dlNdImg,
	dlNowBtn,
	dlPrice,
	dlPriceLabel,
	dlPriceRow,
	dlTagFree,
	dlTagLock,
	dlTagPay,
	dlTitle,
} from "../utils/download-styles.ts";
import {
	DEFAULT_DOWNLOAD_COVER,
	encodeDownloadUrl,
	encryptDownloadUrl,
	hashDownloadPassword,
	resolveDownloadCover,
	stripMdEmphasis,
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
const LABEL_PAY_RES = "付费资源";
const LABEL_NEED_PASSWORD = "需访问密码";
/**
 * 作者没写 hint 时的兜底提示。
 *
 * 访问密码按设计不出现在页面任何位置（只有地址被密码派生密钥加密），
 * 因此「没写 hint 的加密卡片」对读者是一条死路：点下载弹框要密码，
 * 而页面上查不到任何获取途径。这里补一句固定的下一步动作，
 * 至少让读者知道该去找谁，而不是对着输入框反复试错。
 */
const LABEL_HINT_FALLBACK = "未提供访问密码？请联系作者获取";

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
 * 封面取值优先级：显式 cover（走 /public 规则）→ 自动封面（文章第一张图，原样交给 Astro）
 * → 默认占位图。autocover 由 remark-download-list 挂上来，是内容集合相对路径，
 * 绝不能用 resolveDownloadCover 处理，否则会被补成 /images/xxx 而 404。
 */
function pickCover(explicit, auto) {
	const v = asString(explicit).trim();
	if (v) return resolveCover(v);
	const a = asString(auto).trim();
	return a || DEFAULT_DOWNLOAD_COVER;
}

/**
 * 文件大小（元信息行内的一项）。
 *
 * `size` 字段一直存在于指令与 CMS 表单里，但早期版本只读取、从未渲染，
 * 导致作者填了大小却看不到。这里补齐渲染，两处（普通卡 / 付费卡）共用。
 */
function sizeInline(size) {
	const value = asString(size).trim();
	if (!value) return null;
	return h("span", { class: "shrink-0" }, [value]);
}

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
 * 封面图节点。
 *
 * hastscript 会把 `class` 规范化成 className 数组；一旦这张图被 Astro 的
 * `__ASTRO_IMAGE_` 机制接管（自动封面走的就是这条路），数组会被原样渲染成
 * `className="a,b,c"` 这种非法属性，样式全丢、图片撑破容器。
 * 这里直接写字符串 class，两条渲染路径下都是合法的 class 属性。
 */
function coverImg(src, cls) {
	const node = h("img", { src, alt: "", loading: "lazy" });
	if (node.properties) {
		delete node.properties.className;
		node.properties.class = cls;
	}
	return node;
}

/**
 * 卡片外壳：左封面（角标压左上角）+ 右侧标题 / 元信息 + 底部「类型 + 提取码 + 按钮」。
 * 普通 / 加密 / 付费三种卡片共用，仅传入内容与配色不同。
 *
 * 卡片刻意不显示简介与文件大小：简介那行小灰字没人看，还会把卡片撑高；
 * 提取码则从元信息行挪到按钮左边，避免用户「看不到提取码」。
 */
function renderShell({
	id,
	cover,
	tagText,
	tagClass,
	name,
	meta,
	footLeft,
	footLeftClass = "min-w-0",
	footRight,
}) {
	// 显式写 id 属性，而不是 "div#id" 选择器：锚点里可能含中文，
	// hastscript 的 CSS 选择器解析只认 ASCII，中文会解析失败。
	return h("div", { id, class: "not-prose my-4 scroll-mt-24" }, [
		h("div", { class: dlCard }, [
			h("div", { class: dlCoverWrap }, [
				coverImg(cover, dlCover),
				tagText
					? h("span", { class: `${dlCoverTag} ${tagClass}` }, [tagText])
					: null,
			]),
			h("div", { class: dlBody }, [
				h("div", { class: dlTitle, title: name }, [name]),
				meta && meta.length ? h("div", { class: dlMetaRow }, meta) : null,
				h("div", { class: dlFoot }, [
					h("div", { class: footLeftClass }, [footLeft]),
					h("div", { class: dlAction }, footRight),
				]),
			]),
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
/**
 * 去掉功能字段两端多余的引号与空白
 *
 * 从 Word / 微信 / 富文本粘贴时，属性值常带中文弯引号：
 *   url=“https://pan.baidu.com/s/xxx”  code=“1wau”
 * 解析后引号会跟着值一起进来，url 通不过 http(s) 校验直接退化成
 * 「Invalid directive」提示，提取码复制出来也多两个引号。
 * 这里只清洗地址 / 提取码 / 访问密码这三个功能字段，
 * 名称与简介里的引号属于正常排版，保持原样。
 */
const WRAP_QUOTES = /^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g;

function cleanField(value) {
	return asString(value).replace(WRAP_QUOTES, "");
}

/** 标题只去中文弯引号：弯引号是复制粘贴时带来的分隔符，不该显示在卡片上 */
function cleanTitle(value) {
	return asString(value).replace(/^[\s“”‘’]+|[\s“”‘’]+$/g, "");
}

function normalizeItem(props) {
	const url = cleanField(props.url);
	if (!url) return null;

	const isSafeUrl =
		/^https?:\/\//i.test(url) ||
		url.startsWith("/") ||
		url.startsWith("./") ||
		url.startsWith("../");
	if (!isSafeUrl) return null;

	const password = cleanField(props.password);
	const desc = asString(props.desc).trim();
	const source = asString(props.source).trim();
	const size = asString(props.size).trim();
	const code = cleanField(props.code);
	const hint = asString(props.hint).trim();
	const icon = asString(props.icon).trim();
	const cover = asString(props.cover).trim();
	const autocover = asString(props.autocover).trim();
	const tag = asString(props.tag).trim();
	const rawName =
		cleanTitle(props.name) ||
		cleanTitle(props.title) ||
		cleanTitle(props.source);
	// 卡片标题按纯文本渲染，剥掉作者手写的 ** 粗体符号
	const name = stripMdEmphasis(rawName) || i18n(I18nKey.downloadAction);

	return {
		name,
		rawName,
		url,
		desc: stripMdEmphasis(desc || source),
		size,
		code,
		hint,
		icon,
		cover,
		autocover,
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

	const rawName =
		asString(props.name).trim() ||
		asString(props.title).trim() ||
		asString(props.source).trim();
	const name = stripMdEmphasis(rawName) || LABEL_PAY_RES;
	const price = asString(props.price).trim();
	const size = asString(props.size).trim();
	const cover = pickCover(props.cover, props.autocover);
	const buyText = asString(props.buyText).trim() || "获取或购买";
	// 付费 / 加密双模式：只判断「有没有设密码」，密码本身绝不输出
	const hasPassword = Boolean(
		asString(props.password).trim() || asString(props.hint).trim(),
	);

	const id = dlAnchorId(rawName);

	/* 元信息行：网盘（可选）· 文件大小（可选）· 需访问密码 */
	const meta = [];
	const ndEl = netdiskInline(resolveNetdisk(asString(props.icon).trim(), ""));
	if (ndEl) meta.push(ndEl);
	const sizeEl = sizeInline(size);
	if (sizeEl) meta.push(sizeEl);
	if (hasPassword) {
		meta.push(
			h("span", { class: "inline-flex shrink-0 items-center gap-1" }, [
				svgIcon("lock", 12),
				LABEL_NEED_PASSWORD,
			]),
		);
	}

	/* 底部左侧：价格 + 「付费 / 密码」 */
	const footLeft = h("div", { class: dlPriceRow }, [
		price ? h("span", { class: dlPrice }, [`¥${price}`]) : null,
		h("span", { class: dlPriceLabel }, [
			hasPassword ? "付费 / 密码" : LABEL_PAY_RES,
		]),
	]);

	const action = h(
		"a",
		{
			class: dlBuyBtn,
			href: buy,
			target: "_blank",
			rel: "noopener noreferrer",
			// .prose a 会把正文链接染色并加下划线（权重高于 text-white），
			// 这里用内联样式压住，保证渐变按钮上是白字
			style: "color:#fff;text-decoration:none",
			"data-dl-pay": asString(props.pay).trim() || "1",
		},
		[svgIcon("download", 15), h("span", {}, [buyText])],
	);

	return renderShell({
		id,
		cover,
		tagText: hasPassword ? "付费/加密" : "付费",
		tagClass: dlTagPay,
		name,
		meta,
		footLeft,
		footRight: [action],
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

	/* 元信息行：网盘名 · 文件大小 · 需访问密码（提取码不在这里，见下方按钮左侧） */
	const meta = [];
	const ndEl = netdiskInline(nd);
	if (ndEl) meta.push(ndEl);
	const sizeEl = sizeInline(item.size);
	if (sizeEl) meta.push(sizeEl);
	if (lock) {
		meta.push(
			h("span", { class: "inline-flex shrink-0 items-center gap-1" }, [
				svgIcon("lock", 12),
				LABEL_NEED_PASSWORD,
			]),
		);
	}

	/* 提取码：紧贴下载按钮左侧，点一下即复制 */
	const codeChip = item.code
		? h(
				"button",
				{
					type: "button",
					class: dlCodeChip,
					"data-dl-code": item.code,
					"data-dl-code-copied": i18n(I18nKey.downloadCodeCopied),
					title: `${i18n(I18nKey.downloadCode)}: ${item.code}`,
				},
				[
					h("span", { "data-dl-code-text": true }, [
						`${i18n(I18nKey.downloadCode)}：${item.code}`,
					]),
				],
			)
		: null;

	/* 底部左侧：资源类型（免费 / 加密 / 付费） */
	const footLeft = h("span", { class: `${dlFootKind} ${lock ? dlFootLock : dlFootFree}` }, [
		lock ? LABEL_LOCK_RES : LABEL_FREE_RES,
	]);

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
			// 只有加密资源才需要；无密码的卡片前端不会显示它
			"data-dl-hint-fallback": LABEL_HINT_FALLBACK,
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
		cover: pickCover(item.cover, item.autocover),
		tagText,
		tagClass,
		name: item.name,
		meta,
		footLeft,
		// 手机端卡片窄，封面角标已经写明「免费 / 加密」，这里不再占一行
		footLeftClass: "min-w-0 hidden sm:block",
		footRight: codeChip ? [codeChip, action] : [action],
	});
}
