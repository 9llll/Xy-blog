import type { CollectionEntry } from "astro:content";
import { getSortedPosts } from "./content-utils";

/**
 * 首页每页文章数
 *
 * 取 12 而不是 10：网格版是三列，12 篇正好排满 4 行，最后一行不会缺角。
 * 两种版式共用同一个值 —— 版式切换只改外观，分页地址（/page/2/…）保持不变，
 * 否则切换一次版式就会让原本存在的分页页变成 404。
 */
export const HOME_PAGE_SIZE = 12;

export type HomePost = CollectionEntry<"posts">;

/**
 * 首页 / 分页页共用的文章序列（已按置顶 + 发布时间倒序）。
 * 用完整 entry 而不是 getSortedPostsList()，因为列表要读正文来判断
 * 「免费 / 加密 / 资讯 / 开源」类型徽章。
 */
export async function getHomePosts(): Promise<HomePost[]> {
	return await getSortedPosts();
}

/** 总页数（至少 1 页，空站也要有首页） */
export function getTotalPages(total: number): number {
	return Math.max(1, Math.ceil(total / HOME_PAGE_SIZE));
}

/** 取第 page 页（从 1 开始）的文章 */
export function slicePage(posts: HomePost[], page: number): HomePost[] {
	const start = (page - 1) * HOME_PAGE_SIZE;
	return posts.slice(start, start + HOME_PAGE_SIZE);
}

/** 分页链接：第 1 页就是首页，其余走 /page/N/ */
export function getPageUrl(page: number): string {
	return page <= 1 ? "/" : `/page/${page}/`;
}
