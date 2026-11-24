/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * ::post{id="文章slug"} —— 在正文里引用另一篇文章
 *
 * 渲染分两段：
 *   1. 构建期输出同尺寸的骨架（服务端 HTML，避免加载完成后页面跳动）
 *   2. 浏览器端拉 /api/<id>.json 填充真实内容
 *
 * 为什么不在构建期直接渲染：rehype 插件拿不到其它文章的集合与图片资源，
 * 只能由页面层去做；这个接口是 prerender 的静态 JSON，一次请求即完成。
 *
 * 样式在 src/styles/ref-post-card.css，颜色全部走主题变量。
 */

const DATE_ICON =
	'<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>';
const CLOCK_ICON =
	'<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>';

/** 骨架：尺寸与成品完全一致，加载时不会引起布局位移 */
function renderSkeleton(containerId) {
	return h("div", { id: containerId, class: "ref-post-card-host is-loading" }, [
		h("div", { class: "rpc-skeleton-cover" }),
		h("div", { class: "rpc-skeleton-body" }, [
			h("div", { class: "rpc-skeleton-line" }),
			h("div", { class: "rpc-skeleton-line w-70" }),
			h("div", { class: "rpc-skeleton-line w-40" }),
		]),
	]);
}

/** 浏览器端加载脚本（字符串形式，随页面内联输出） */
function renderLoader(containerId, id) {
	return `
(function () {
	var host = document.getElementById(${JSON.stringify(containerId)});
	if (!host) return;

	var API = ${JSON.stringify(`/api/${id}.json`)};
	var HREF = ${JSON.stringify(`/${id}`)};

	function iconSvg(path) {
		return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">' + path + "</svg>";
	}

	function metaItem(path, text) {
		var wrap = document.createElement("span");
		wrap.className = "rpc-meta-item";
		wrap.innerHTML = iconSvg(path);
		var label = document.createElement("span");
		label.textContent = text;
		wrap.appendChild(label);
		return wrap;
	}

	function formatDate(value) {
		var d = new Date(value);
		if (isNaN(d.getTime())) return "";
		return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
	}

	function build(data) {
		var card = document.createElement("a");
		// no-styling：正文的 .custom-md a:not(.no-styling) 会强制 display:inline-block、
		// 主色文字与虚线下划线，把卡片压成竖排——加上这个类即被排除
		card.className = "ref-post-card no-styling";
		card.href = HREF;

		var cover = document.createElement("span");
		cover.className = "rpc-cover";
		if (data.image) {
			var img = document.createElement("img");
			img.src = data.image;
			img.alt = "";
			img.loading = "lazy";
			img.addEventListener("error", function () {
				img.remove();
			});
			cover.appendChild(img);
		}

		var body = document.createElement("span");
		body.className = "rpc-body";

		var title = document.createElement("span");
		title.className = "rpc-title";
		title.textContent = data.title || "未命名文章";
		body.appendChild(title);

		if (data.description) {
			var desc = document.createElement("span");
			desc.className = "rpc-desc";
			desc.textContent = data.description;
			body.appendChild(desc);
		}

		var meta = document.createElement("span");
		meta.className = "rpc-meta";

		var category = data.category && data.category[0];
		if (category) {
			var tag = document.createElement("span");
			tag.className = "rpc-tag";
			tag.textContent = String(category);
			tag.title = category;
			meta.appendChild(tag);
		}
		if (data.published) {
			var dateText = formatDate(data.published);
			if (dateText) meta.appendChild(metaItem(${JSON.stringify(DATE_ICON)}, dateText));
		}
		if (data.minutes) meta.appendChild(metaItem(${JSON.stringify(CLOCK_ICON)}, data.minutes + " 分钟"));

		if (meta.childNodes.length) body.appendChild(meta);

		card.appendChild(cover);
		card.appendChild(body);
		return card;
	}

	function renderFail() {
		var box = document.createElement("span");
		box.className = "rpc-fail";
		var text = document.createElement("span");
		text.textContent = "引用卡片加载失败";
		var retry = document.createElement("button");
		retry.type = "button";
		retry.textContent = "重试";
		retry.addEventListener("click", function (e) {
			e.preventDefault();
			load();
		});
		box.appendChild(text);
		box.appendChild(retry);
		return box;
	}

	async function load() {
		host.classList.remove("is-filled");
		host.classList.add("is-loading");
		try {
			var res = await fetch(API, { headers: { Accept: "application/json" } });
			if (!res.ok) throw new Error("HTTP " + res.status);
			var data = await res.json();
			if (!data || !data.title) throw new Error("数据不完整");
			host.classList.remove("is-loading");
			host.classList.add("is-filled");
			host.replaceChildren(build(data));
		} catch (err) {
			host.classList.remove("is-loading");
			host.replaceChildren(renderFail());
		}
	}

	load();
})();
`;
}

/** 同一页可能引用同一篇文章多次，容器 id 必须唯一 */
let instanceSeq = 0;

export function PostCardComponent(props, children) {
	// 容器指令是错误写法，提示正确格式
	if (Array.isArray(children) && children.length !== 0) {
		return h("div", { class: "ref-post-card-host" }, [
			h("span", { class: "rpc-fail" }, [
				'::post 必须写成单行指令：::post{id="文章slug"}',
			]),
		]);
	}

	const id = props?.id ? String(props.id).trim() : "";
	if (!id) {
		return h("div", { class: "ref-post-card-host" }, [
			h("span", { class: "rpc-fail" }, ['::post 缺少 id，格式：::post{id="文章slug"}']),
		]);
	}

	const containerId = `post-card-${id.replace(/[^\w-]/g, "-")}-${++instanceSeq}`;

	return [renderSkeleton(containerId), h("script", {}, renderLoader(containerId, id))];
}
