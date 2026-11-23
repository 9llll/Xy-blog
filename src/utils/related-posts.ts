import type { CollectionEntry } from "astro:content";
import { getSortedPosts } from "./content-utils";

/**
 * 相关文章推荐
 *
 * 纯构建期计算，不跑在浏览器里，也不发任何请求。
 * 打分口径（同一篇文章可叠加）：
 *   - 分类完全相同 +3
 *   - 同一父级下的兄弟分类 +2（游戏资源/传奇 与 游戏资源/大话西游）
 *   - 每命中一个标签 +2
 * 同分时按发布时间倒序，保证新内容优先露出。
 *
 * 除了给读者找出路，这层内链还能让蜘蛛顺着文章互相爬到每一篇，
 * 对新文章被收录有明显帮助。
 */
export async function getRelatedPosts(
	current: CollectionEntry<"posts">,
	limit = 4,
): Promise<CollectionEntry<"posts">[]> {
	const all = await getSortedPosts();

	const currentCategories = new Set(
		(current.data.category ?? []).map((c) => String(c).trim()).filter(Boolean),
	);
	const currentTags = new Set(
		(current.data.tags ?? []).map((t) => String(t).trim()).filter(Boolean),
	);
	const currentRoot = [...currentCategories][0]?.split("/")[0] ?? "";

	const scored = all
		.filter((post) => post.slug !== current.slug)
		.map((post) => {
			let score = 0;

			for (const category of (post.data.category ?? []).map((c) => String(c).trim())) {
				if (currentCategories.has(category)) {
					score += 3;
					continue;
				}
				// 同属一个大类也算相近，权重低一档
				if (currentRoot && category.split("/")[0] === currentRoot) score += 2;
			}

			for (const tag of (post.data.tags ?? []).map((t) => String(t).trim())) {
				if (tag && currentTags.has(tag)) score += 2;
			}

			return { post, score };
		})
		.filter((entry) => entry.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return new Date(b.post.data.published).getTime() - new Date(a.post.data.published).getTime();
		});

	return scored.slice(0, limit).map((entry) => entry.post);
}
