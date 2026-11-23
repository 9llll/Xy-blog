/**
 * Pages CMS 配置体检
 *
 * 为什么需要它：`.pages.yml` 里的字段类型拼错一个字母（例如 `text` 写成 `tex`），
 * Pages CMS 不会报错，而是**静默丢弃整个字段**——表现就是「编辑页没有这个输入框」，
 * 但 Configuration 页看起来一切正常。这种错误只能靠比对类型白名单发现。
 *
 * 白名单来源：Pages CMS 2.1.8 的 fields/core 目录（boolean/code/date/file/image/
 * number/reference/rich-text/select/string/text/uuid）+ 三种结构类型 object/block。
 *
 * 用法：
 *   node scripts/cms-check.mjs            # 检查仓库根目录的 .pages.yml
 *   node scripts/cms-check.mjs 其他路径
 * 退出码：0 通过 / 1 有问题 / 2 无法解析
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Pages CMS 支持的字段类型 */
const VALID_TYPES = new Set([
	"boolean",
	"code",
	"date",
	"file",
	"image",
	"number",
	"reference",
	"rich-text",
	"select",
	"string",
	"text",
	"uuid",
	"object",
	"block",
]);

/** 编辑距离，用于给拼错的类型推荐最接近的合法值 */
function distance(a, b) {
	const m = a.length;
	const n = b.length;
	let prev = Array.from({ length: n + 1 }, (_, j) => j);
	for (let i = 1; i <= m; i++) {
		const cur = [i];
		for (let j = 1; j <= n; j++) {
			cur[j] = Math.min(
				prev[j] + 1,
				cur[j - 1] + 1,
				prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
		}
		prev = cur;
	}
	return prev[n];
}

/** 找出与给定字符串最接近的合法类型（距离超过 3 视为无明显建议） */
export function suggestType(value) {
	let best = null;
	let bestDistance = Infinity;
	for (const type of VALID_TYPES) {
		const d = distance(String(value).toLowerCase(), type);
		if (d < bestDistance) {
			bestDistance = d;
			best = type;
		}
	}
	return bestDistance <= 3 ? best : null;
}

/** 递归校验字段数组，命中项写入 problems */
export function checkFields(fields, where, problems) {
	if (!Array.isArray(fields)) {
		problems.push(`${where}：fields 不是数组`);
		return;
	}
	fields.forEach((field, index) => {
		const label = `${where}[${index}]${field?.name ? ` (${field.name})` : ""}`;
		if (!field || typeof field !== "object") {
			problems.push(`${label}：字段定义不是对象`);
			return;
		}
		if (field.name == null || field.name === "") {
			problems.push(`${label}：缺少 name`);
		}
		if (field.type == null) {
			problems.push(`${label}：缺少 type`);
			return;
		}
		const type = String(field.type);
		if (!VALID_TYPES.has(type)) {
			const hint = suggestType(type);
			problems.push(
				`${label}：type "${type}" 不是合法类型` +
					(hint ? `，最接近的是 "${hint}"` : "") +
					`（Pages CMS 会静默丢弃该字段，编辑页不显示输入框）`,
			);
		}
		if (type === "object") {
			if (!Array.isArray(field.fields)) problems.push(`${label}：object 缺少 fields`);
			else checkFields(field.fields, label, problems);
		}
		if (type === "block") {
			if (!Array.isArray(field.blocks)) problems.push(`${label}：block 缺少 blocks`);
			else {
				field.blocks.forEach((block, i) => {
					if (!Array.isArray(block?.fields)) {
						problems.push(`${label}.blocks[${i}]：缺少 fields`);
					} else {
						checkFields(block.fields, `${label}.blocks[${i}]`, problems);
					}
				});
			}
		}
		if (type === "select") {
			const values = field.options?.values ?? field.options?.items;
			if (!Array.isArray(values) || values.length === 0) {
				problems.push(`${label}：select 缺少 options.values`);
			}
		}
		if (type === "rich-text") {
			// 正文位置通常用 name: body，这里不做强制，仅提示
		}
	});
}

/**
 * 校验 content 条目。条目类型只有三种：
 *   collection（可新建的文章集合）/ file（单文件配置）/ group（侧边栏分组，靠 items 递归）
 */
function checkContentEntries(entries, prefix, problems) {
	if (!Array.isArray(entries)) {
		problems.push(`${prefix}：条目不是数组`);
		return;
	}
	entries.forEach((entry, index) => {
		const label = `${prefix}[${index}]${entry?.name ? ` (${entry.name})` : ""}`;
		if (!entry || typeof entry !== "object") {
			problems.push(`${label}：条目不是对象`);
			return;
		}
		if (!entry.name) problems.push(`${label}：缺少 name`);

		if (entry.type === "group") {
			if (!Array.isArray(entry.items)) problems.push(`${label}：group 缺少 items`);
			else checkContentEntries(entry.items, label, problems);
			return;
		}

		if (entry.type == null) {
			problems.push(`${label}：缺少 type（collection / file / group）`);
		} else if (entry.type !== "collection" && entry.type !== "file") {
			problems.push(`${label}：type "${entry.type}" 不是合法条目类型（collection / file / group）`);
		}

		checkFields(entry.fields, label, problems);
	});
}

/** 遍历整个配置文档 */
export function checkConfig(config) {
	const problems = [];
	if (!config || typeof config !== "object") {
		return ["配置文件不是有效的 YAML 对象"];
	}

	for (const key of ["components"]) {
		const group = config[key];
		if (group && typeof group === "object") {
			for (const [name, field] of Object.entries(group)) {
				checkFields([{ name, ...field }], `components.${name}`, problems);
			}
		}
	}

	checkContentEntries(config.content, "content", problems);

	if (Array.isArray(config.media)) {
		config.media.forEach((media, index) => {
			const label = `media[${index}]${media?.name ? ` (${media.name})` : ""}`;
			if (!media?.input) problems.push(`${label}：缺少 input（仓库内目录）`);
			if (!media?.output) problems.push(`${label}：缺少 output（站点内路径）`);
		});
	}

	if (config.settings != null && typeof config.settings !== "object") {
		problems.push("settings 不是对象");
	}

	return problems;
}

/** 动态定位 yaml 解析器（项目用 pnpm，顶层不一定可见） */
export async function loadYaml() {
	try {
		return await import("yaml");
	} catch {
		// fallthrough
	}
	const pnpmDir = "node_modules/.pnpm";
	if (fs.existsSync(pnpmDir)) {
		const candidates = fs
			.readdirSync(pnpmDir)
			.filter((dir) => /^yaml@\d/.test(dir))
			.sort()
			.reverse();
		for (const dir of candidates) {
			const entry = path.resolve(pnpmDir, dir, "node_modules/yaml/dist/index.js");
			if (fs.existsSync(entry)) return await import(`file://${entry}`);
		}
	}
	throw new Error("找不到 yaml 解析器（node_modules 里没有 yaml）");
}

async function main() {
	const target = process.argv[2] ?? ".pages.yml";
	if (!fs.existsSync(target)) {
		console.error(`找不到配置文件：${target}`);
		process.exit(2);
	}

	let yaml;
	try {
		yaml = await loadYaml();
	} catch (error) {
		console.error(String(error.message ?? error));
		process.exit(2);
	}

	let config;
	try {
		config = yaml.parse(fs.readFileSync(target, "utf8"));
	} catch (error) {
		console.error("YAML 语法错误：");
		console.error(String(error.message ?? error));
		process.exit(2);
	}

	const problems = checkConfig(config);
	const contentCount = Array.isArray(config.content) ? config.content.length : 0;
	const fieldCount = (Array.isArray(config.content) ? config.content : []).reduce(
		(sum, entry) => sum + (Array.isArray(entry?.fields) ? entry.fields.length : 0),
		0,
	);

	if (problems.length === 0) {
		console.log(`✅ ${target} 通过：${contentCount} 个集合，顶层字段 ${fieldCount} 个，类型全部合法`);
		process.exit(0);
	}

	console.error(`❌ ${target} 发现 ${problems.length} 个问题：`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
