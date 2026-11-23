import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils.ts";

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].slug;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].slug;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: post.slug,
		data: post.data,
	}));

	return sortedPostsList;
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		if (post.data.tags && Array.isArray(post.data.tags)) {
			post.data.tags.forEach((tag: string) => {
				if (!countMap[tag]) countMap[tag] = 0;
				countMap[tag]++;
			});
		}
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

/**
 * 层叠分类节点。
 *
 * 分类名用 `/` 表示层级：`游戏资源/动作冒险` 是 `游戏资源` 的子项。
 * 只写一级的旧文章不受影响，`getCategoryList()` 仍返回扁平列表。
 */
export type CategoryNode = {
	/** 当前层级名称，如「动作冒险」 */
	name: string;
	/** 完整路径，如「游戏资源/动作冒险」，用于归档筛选 */
	fullName: string;
	/** 该节点下（含所有子级）的文章数，按文章去重 */
	count: number;
	url: string;
	depth: number;
	children: CategoryNode[];
};

/** 把 `父/子` 形式的分类名规整成标准路径 */
function normalizeCategoryPath(raw: string): string {
	return raw
		.trim()
		.replace(/\s*\/\s*/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

/** 取分类的末级名称，用于列表徽章等窄位置展示 */
export function getCategoryLabel(category?: string | null): string {
	if (!category) return "";
	const segments = normalizeCategoryPath(category).split("/").filter(Boolean);
	return segments.length > 0 ? segments[segments.length - 1] : normalizeCategoryPath(category);
}

/** 判断某个文章分类是否命中筛选条件（选中父级时包含其所有子级） */
export function matchesCategoryFilter(postCategory: string, filter: string): boolean {
	const target = normalizeCategoryPath(postCategory);
	const base = normalizeCategoryPath(filter);
	return target === base || target.startsWith(`${base}/`);
}

/** 构建分类树，父级计数包含全部子级 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const roots: CategoryNode[] = [];
	const nodeByPath = new Map<string, CategoryNode>();
	const postsByPath = new Map<string, Set<string>>();

	const ensureNode = (path: string): CategoryNode => {
		const existing = nodeByPath.get(path);
		if (existing) return existing;

		const segments = path.split("/");
		const node: CategoryNode = {
			name: segments[segments.length - 1],
			fullName: path,
			count: 0,
			url: getCategoryUrl([path]),
			depth: segments.length - 1,
			children: [],
		};
		nodeByPath.set(path, node);

		if (segments.length === 1) {
			roots.push(node);
		} else {
			ensureNode(segments.slice(0, -1).join("/")).children.push(node);
		}
		return node;
	};

	allBlogPosts.forEach((post) => {
		const categories = post.data.category;
		if (!Array.isArray(categories) || categories.length === 0) return;

		categories.forEach((raw: string) => {
			const path = normalizeCategoryPath(raw);
			if (!path) return;

			const segments = path.split("/");
			// 每一级前缀都记一次该文章，父级计数自然包含子级且不重复
			for (let i = 1; i <= segments.length; i++) {
				const prefix = segments.slice(0, i).join("/");
				ensureNode(prefix);
				const bucket = postsByPath.get(prefix) ?? new Set<string>();
				bucket.add(post.id);
				postsByPath.set(prefix, bucket);
			}
		});
	});

	for (const [path, bucket] of postsByPath) {
		const node = nodeByPath.get(path);
		if (node) node.count = bucket.size;
	}

	const sortNodes = (nodes: CategoryNode[]) => {
		nodes.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
		nodes.forEach((n) => sortNodes(n.children));
	};
	sortNodes(roots);

	return roots;
}

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { category: string[] | null } }) => {
		if (!post.data.category || !Array.isArray(post.data.category) || post.data.category.length === 0) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		post.data.category.forEach((cat: string) => {
			const categoryName = cat.trim();
			count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
		});
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});
	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl([c])
		});
	}
	return ret;
}
