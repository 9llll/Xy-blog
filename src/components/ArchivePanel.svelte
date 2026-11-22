<script lang="ts">
import { onMount } from "svelte";

import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import { getPostUrlBySlug } from "../utils/url-utils";

/* 筛选条件由 archive.astro 从服务端 URL 传入。
   组件内不再读 window——原来在模块顶层调用 new URLSearchParams(window.location.search)，
   导致它只能 client:only 渲染，归档页对爬虫是一片空白。 */
export let filterTags: string[] = [];
export let filterCategories: string[] = [];
export let onlyUncategorized = false;
export let sortedPosts: Post[] = [];

interface Post {
	slug: string;
	data: {
		title: string;
		tags: string[];
		category?: string;
		published: Date;
	};
}

interface Group {
	year: number;
	posts: Post[];
}

/**
 * 标题必须写成响应式派生值（`$:`），不能在模板里调函数。
 * Svelte 编译器只追踪模板中直接引用的顶层变量，
 * 函数内部读到的 activeTags / activeCategories 不在依赖图里，
 * 结果就是筛选列表变了、标题还停在「归档」。
 */
$: panelTitle = (() => {
	if (activeUncategorized) {
		return i18n(I18nKey.uncategorized);
	}
	if (activeCategories.length > 0) {
		return activeCategories.join(", ");
	}
	if (activeTags.length > 0) {
		return activeTags.map((tag) => `#${tag}`).join(" ");
	}
	return i18n(I18nKey.archive);
})();

function formatDate(date: Date) {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}

function formatTag(tagList: string[]) {
	return tagList.map((t) => `#${t}`).join(" ");
}

/**
 * 筛选 + 按年份分组。
 * 纯同步函数并在模块顶层直接调用一次：Svelte 服务端渲染会执行顶层代码，
 * 于是 <ArchivePanel client:load /> 的首屏 HTML 里就有完整列表，
 * 爬虫与「禁用 JS」的访客都能看到归档内容。
 */
function buildGroups(
	posts: Post[],
	tagList: string[],
	categoryList: string[],
	uncategorizedOnly: boolean,
): Group[] {
	let filteredPosts: Post[] = posts;

	if (tagList.length > 0) {
		filteredPosts = filteredPosts.filter(
			(post) =>
				Array.isArray(post.data.tags) &&
				post.data.tags.some((tag) => tagList.includes(tag)),
		);
	}

	if (categoryList.length > 0) {
		filteredPosts = filteredPosts.filter(
			(post) =>
				Array.isArray(post.data.category) &&
				post.data.category.some((cat) => categoryList.includes(cat)),
		);
	}

	if (uncategorizedOnly) {
		filteredPosts = filteredPosts.filter((post) => !post.data.category);
	}

	const grouped = filteredPosts.reduce(
		(acc, post) => {
			// props 经过序列化后可能是字符串，统一用 Date 包一层
			const year = new Date(post.data.published).getFullYear();
			if (!acc[year]) {
				acc[year] = [];
			}
			acc[year].push(post);
			return acc;
		},
		{} as Record<number, Post[]>,
	);

	const groupedPostsArray = Object.keys(grouped).map((yearStr) => ({
		year: Number.parseInt(yearStr, 10),
		posts: grouped[Number.parseInt(yearStr, 10)],
	}));

	groupedPostsArray.sort((a, b) => b.year - a.year);
	return groupedPostsArray;
}

/* 生效中的筛选条件。
   初始取 props（将来切成 SSR 时有效）；静态部署下 props 恒为空，
   由 onMount 从真实 URL 补齐。两者共用同一份状态，
   保证「SSR 首屏是全量列表」与「带参访问能正确筛选」同时成立。 */
let activeTags: string[] = filterTags;
let activeCategories: string[] = filterCategories;
let activeUncategorized: boolean = onlyUncategorized;

let groups: Group[] = [];
$: groups = buildGroups(sortedPosts, activeTags, activeCategories, activeUncategorized);

onMount(() => {
	const params = new URLSearchParams(window.location.search);
	const tags = params.getAll("tag");
	const categories = params.getAll("category");
	const uncategorized = params.has("uncategorized");
	if (tags.length || categories.length || uncategorized) {
		activeTags = tags;
		activeCategories = categories;
		activeUncategorized = uncategorized;
	}
});
</script>

<div class="card-base px-8 py-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-75">{panelTitle}</h1>
	</div>
	
    {#each groups as group}
        <div>
            <div class="flex flex-row w-full items-center h-[3.75rem]">
                <div class="w-[15%] md:w-[10%] transition text-2xl font-bold text-right text-75">
                    {group.year}
                </div>
                <div class="w-[15%] md:w-[10%]">
                    <div
                            class="h-3 w-3 bg-none rounded-full outline outline-[var(--primary)] mx-auto
                  -outline-offset-[2px] z-50 outline-3"
                    ></div>
                </div>
                <div class="w-[70%] md:w-[80%] transition text-left text-50">
                    {group.posts.length} {i18n(group.posts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
                </div>
            </div>

            {#each group.posts as post}
                <a
                        href={getPostUrlBySlug(post.slug)}
                        aria-label={post.data.title}
                        class="group btn-plain !block h-10 w-full rounded-lg hover:text-[initial]"
                >
                    <div class="flex flex-row justify-start items-center h-full">
                        <!-- date -->
                        <div class="w-[15%] md:w-[10%] transition text-sm text-right text-50">
                            {formatDate(post.data.published)}
                        </div>

                        <!-- dot and line -->
                        <div class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center">
                            <div
                                    class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                       bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-[var(--primary)]
                       outline outline-4 z-50
                       outline-[var(--card-bg)]
                       group-hover:outline-[var(--btn-plain-bg-hover)]
                       group-active:outline-[var(--btn-plain-bg-active)]"
                            ></div>
                        </div>

                        <!-- post title -->
                        <div
                                class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-[var(--primary)]
                     text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
                        >
                            {post.data.title}
                        </div>

                        <!-- tag list -->
                        <div
                                class="hidden md:block md:w-[15%] text-left text-sm transition
                     whitespace-nowrap overflow-ellipsis overflow-hidden text-30"
                        >
                            {formatTag(post.data.tags)}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {/each}
</div>
