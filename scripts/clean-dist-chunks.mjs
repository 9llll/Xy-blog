/**
 * 清理静态构建产物里用不到的 SSR chunk
 *
 * 背景：Astro 的静态构建仍会产出 dist/chunks（约 200MB / 500+ 个 .mjs），
 * 里面是内容层的原始数据——**包含文章正文中的下载���址与访问密码明文**。
 * 这些文件不会被任何页面引用，但会被整包部署到线上，等于公开可下载。
 *
 * 这里在构建结束后把它们删掉：
 *   1. 堵住「原始正文 / 下载地址 / 访问密码」的泄露渠道
 *   2. 部署体积从 ~250MB 降到 ~50MB，部署速度大幅提升
 *
 * 安全起见：只有确认产物里没有引用 /chunks/ 时才删除，避免误删。
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), process.argv[2] || "dist");
const chunks = join(dist, "chunks");
const server = join(dist, "server");

if (!existsSync(dist)) {
	console.error("[clean-dist-chunks] 找不到 dist 目录，跳过");
	process.exit(0);
}

/**
 * 递归收集指定目录下的文件
 */
function collectFiles(dir, acc = []) {
	if (!existsSync(dir)) return acc;
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			collectFiles(full, acc);
		} else {
			acc.push(full);
		}
	}
	return acc;
}

/**
 * 只检查「真正会被访问」的文件：HTML 页面与 _astro 静态资源。
 * 根目录的 manifest_*.mjs / entry.mjs 是静态构建残留的 SSR 入口，
 * 本身无人引用（它引用 chunks，不代表 chunks 被需要），因此不参与判断。
 */
const publicFiles = [
	...collectFiles(dist).filter((f) => f.endsWith(".html")),
	...collectFiles(join(dist, "_astro")),
];

let referenced = false;
for (const file of publicFiles) {
	try {
		const content = readFileSync(file, "utf8");
		if (content.includes("/chunks/") || content.includes("/server/")) {
			referenced = true;
			console.error(`[clean-dist-chunks] 公开产物引用了 chunk: ${file}`);
			break;
		}
	} catch {
		// 忽略读取失败的文件
	}
}

if (referenced) {
	console.error("[clean-dist-chunks] 公开产物仍引用 chunk，已跳过删除");
	process.exit(0);
}

for (const dir of [chunks, server]) {
	if (!existsSync(dir)) continue;
	rmSync(dir, { recursive: true, force: true });
	console.log(`[clean-dist-chunks] 已删除 ${dir}`);
}

// 根目录残留的 SSR 入口（无人引用的 manifest / entry）
for (const file of collectFiles(dist)) {
	const name = file.split(/[\\/]/).pop() ?? "";
	if (/^(manifest|entry)[^\\/]*\.mjs$/.test(name)) {
		rmSync(file, { force: true });
		console.log(`[clean-dist-chunks] 已删除 ${name}`);
	}
}

console.log("[clean-dist-chunks] 完成");
