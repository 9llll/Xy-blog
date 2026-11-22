import { getSortedPostsList, type PostForList } from "./content-utils";

/** 首页每页文章数 */
export const HOME_PAGE_SIZE = 10;

/** 首页 / 分页页共用的文章序列（已按置顶 + 发布时间倒序） */
export async function getHomePosts(): Promise<PostForList[]> {
	return await getSortedPostsList();
}

/** 总页数（至少 1 页，空站也要有首页） */
export function getTotalPages(total: number): number {
	return Math.max(1, Math.ceil(total / HOME_PAGE_SIZE));
}

/** 取第 page 页（从 1 开始）的文章 */
export function slicePage(posts: PostForList[], page: number): PostForList[] {
	const start = (page - 1) * HOME_PAGE_SIZE;
	return posts.slice(start, start + HOME_PAGE_SIZE);
}

/** 分页链接：第 1 页就是首页，其余走 /page/N/ */
export function getPageUrl(page: number): string {
	return page <= 1 ? "/" : `/page/${page}/`;
}
