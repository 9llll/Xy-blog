/**
 * 下载卡片的样式类名
 *
 * 与 rehype-component-download.mjs（正文 ::download 指令）共用，
 * 避免样式在多处渲染路径上漂移。
 *
 * 版式：左封面（渐变角标压在封面左上角）+ 右侧标题/简介/元信息 + 底部
 * 「价格或类型」与操作按钮，与资源站常见卡片一致：
 *   - 免费 / 加密：底部左侧是资源类型，右侧是「立即下载」
 *   - 付费：底部左侧是 ¥ 价格 + 「付费 / 密码」，右侧是渐变「获取或购买」
 *
 * 注意：Fuwari 使用 Tailwind v3，CSS 变量写法是 bg-[var(--primary)]，
 * 不能用 Tailwind v4 的 bg-(--primary) 简写。
 */

/* ===== 卡片外壳 ===== */

/** 整张卡片 */
export const dlCard =
	"dl-card flex items-stretch gap-3 sm:gap-4 rounded-2xl p-2.5 sm:p-3.5 " +
	"bg-[var(--card-bg)] border border-[var(--line-divider)] shadow-sm " +
	"hover:border-[var(--primary-border-soft)] hover:shadow-md transition-all duration-200";

/** 左侧封面容器
 *
 * 手机端内容区两行排布后卡片变高，封面固定 94px 会在底部留白；
 * 用 self-stretch + 不定高让它跟着卡片高度走（图片 object-cover 裁切填充）。
 */
export const dlCoverWrap =
	"dl-cover-wrap relative shrink-0 w-[94px] self-stretch sm:self-auto sm:w-[168px] sm:h-[118px] " +
	"rounded-xl overflow-hidden bg-[var(--btn-regular-bg)]";

/** 封面图 */
export const dlCover = "dl-cover w-full h-full object-cover";

/** 封面左上角标签：贴角形状（左下 + 右上圆角），像贴在封面上的色带 */
export const dlCoverTag =
	"dl-cover-tag absolute left-0 top-0 z-10 px-2.5 py-1 " +
	"rounded-br-xl rounded-tl-xl text-[0.68rem] font-bold leading-tight " +
	"text-white shadow-sm whitespace-nowrap";

/** 免费标签（绿色渐变） */
export const dlTagFree =
	"bg-gradient-to-br from-[#34d399] to-[#16a34a] text-white";

/** 加密标签（靛蓝→紫渐变） */
export const dlTagLock =
	"bg-gradient-to-br from-[#818cf8] to-[#7c3aed] text-white";

/** 付费标签（橙→玫红渐变，和购买按钮同色系） */
export const dlTagPay =
	"bg-gradient-to-br from-[#ff8a5b] to-[#ff4d6d] text-white";

/** 右侧信息列 */
export const dlBody = "dl-body min-w-0 flex-1 flex flex-col";

/** 资源名称 */
export const dlTitle =
	"dl-title text-[0.9rem] sm:text-[1.05rem] font-bold leading-snug " +
	"text-black/90 dark:text-white/90 line-clamp-2";

/** 元信息行（网盘 / 需密码） */
export const dlMetaRow =
	"dl-meta-row mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 " +
	"text-[0.73rem] leading-none text-black/45 dark:text-white/45";

/** 网盘小圆点 */
export const dlNdDot =
	"dl-nd-dot inline-block w-1.5 h-1.5 rounded-full shrink-0";

/** 网盘小图标（自定义图片时） */
export const dlNdImg = "dl-nd-img w-3.5 h-3.5 rounded object-contain shrink-0";

/** 提取码胶囊（放在下载按钮左边，点击即复制）
 *
 * 用琥珀色而不是主题色：紧挨着红色下载按钮时，同色系会糊成一片，
 * 用户最容易漏看的就是这一块，必须靠对比度把它顶出来。
 */
export const dlCodeChip =
	"dl-code inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 " +
	"text-[0.76rem] sm:text-[0.8rem] font-bold leading-none whitespace-nowrap " +
	"text-[#9a3412] bg-[#ffedd5] border border-[#fdba74] " +
	"dark:text-[#fdba74] dark:bg-[#3f2312] dark:border-[#8a4b1d] " +
	"self-start sm:self-auto " +
	"cursor-pointer select-none hover:brightness-95 active:scale-[0.97] transition-all";

/** 底部行：左侧价格/类型 + 右侧「提取码 + 按钮」，窄屏自动换行 */
export const dlFoot =
	"dl-foot mt-auto pt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-2";

/** 价格行 */
export const dlPriceRow = "dl-price-row flex items-baseline gap-1.5 min-w-0";

/** 价格数字 */
export const dlPrice =
	"dl-price text-[1.2rem] sm:text-[1.45rem] font-extrabold leading-none " +
	"text-[#f5482f] dark:text-[#ff6b52] tracking-tight";

/** 价格后缀（付费 / 密码） */
export const dlPriceLabel =
	"dl-price-label hidden sm:inline text-[0.72rem] text-black/40 dark:text-white/40 truncate";

/** 免费资源（绿） */
export const dlFootFree = "dl-foot-free font-semibold text-[#16a34a] dark:text-[#4ade80]";

/** 加密资源（靛蓝） */
export const dlFootLock = "dl-foot-lock font-semibold text-[#7c3aed] dark:text-[#a78bfa]";

/** 类型文案的通用字号 */
export const dlFootKind = "dl-foot-kind inline-flex items-center gap-1 text-[0.75rem]";

/** 右侧操作区
 *
 * 手机端卡片内容区只有 ~200px（卡片宽 - 封面 94px - 间距），提取码 + 按钮
 * 并排会溢出到卡片外（按钮被裁掉）。所以 <sm 竖排：提取码一行、按钮整行撑满；
 * sm 起恢复「提取码 + 按钮」同一行右对齐。
 */
export const dlAction =
	"dl-action flex w-full flex-col items-stretch gap-2 " +
	"sm:ml-auto sm:w-auto sm:shrink-0 sm:flex-row sm:items-center";

/** 立即下载 / 解锁下载按钮（红色渐变胶囊） */
export const dlNowBtn =
	"dl-now inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 " +
	"text-[0.82rem] sm:w-auto sm:text-[0.88rem] font-bold text-white " +
	"bg-gradient-to-r from-[#ff5b4a] to-[#e01b32] " +
	"shadow-[0_6px_16px_-8px_rgba(224,27,50,0.85)] " +
	"hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer select-none whitespace-nowrap";

/** 付费购买按钮（橙色渐变胶囊，与价格同色系）
 *
 * 注意必须带 `no-styling`：正文容器 `.custom-md a:not(.no-styling)` 会把
 * 链接的 background-image 重置为 none，渐变会被吃掉，按钮变成白底白字。
 */
export const dlBuyBtn =
	"dl-buy no-styling inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 " +
	"text-[0.82rem] sm:w-auto sm:text-[0.88rem] font-bold text-white " +
	"bg-gradient-to-r from-[#ff9f43] to-[#ff5533] " +
	"shadow-[0_6px_16px_-8px_rgba(255,85,51,0.9)] " +
	"hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer select-none whitespace-nowrap";

/* ===== 右栏紧凑卡片（与正文卡同一套视觉语言，只是宽度只有 264px） ===== */

/** 紧凑卡容器：两行结构（信息行 + 操作行） */
export const dlMiniCard =
	"dl-mini flex flex-col gap-2 rounded-xl border border-[var(--line-divider)] " +
	"bg-[var(--card-bg)] p-2.5 transition-all hover:border-[var(--primary-border-soft)] hover:shadow-sm";

/** 信息行：封面 + 标题/元信息 */
export const dlMiniTop = "dl-mini-top flex items-start gap-2.5 min-w-0";

/** 紧凑封面 */
export const dlMiniCoverWrap =
	"dl-cover-wrap relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[var(--btn-regular-bg)]";

/** 紧凑封面上的角标 */
export const dlMiniCoverTag =
	"dl-cover-tag absolute left-0 top-0 z-10 rounded-br-md rounded-tl-md px-1 py-[1px] " +
	"text-[0.5rem] font-bold leading-tight text-white shadow-sm";

/** 紧凑信息列 */
export const dlMiniBody = "dl-mini-body min-w-0 flex-1 flex flex-col gap-0.5";

/** 紧凑标题（最多两行） */
export const dlMiniTitle =
	"dl-mini-title text-[0.8rem] font-bold leading-snug line-clamp-2 " +
	"text-black/90 dark:text-white/90";

/** 紧凑元信息行 */
export const dlMiniMeta =
	"dl-mini-meta flex flex-wrap items-center gap-x-1.5 gap-y-0.5 " +
	"text-[0.65rem] leading-none text-black/45 dark:text-white/45";

/** 操作行（提取码紧贴按钮，统一右对齐） */
export const dlMiniFoot =
	"dl-mini-foot flex items-center justify-end gap-1.5 min-w-0";

/** 紧凑提取码（可点击复制，琥珀色与正文卡一致） */
export const dlMiniCode =
	"dl-code inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 " +
	"text-[0.66rem] font-bold leading-none whitespace-nowrap " +
	"text-[#9a3412] bg-[#ffedd5] border border-[#fdba74] " +
	"dark:text-[#fdba74] dark:bg-[#3f2312] dark:border-[#8a4b1d] " +
	"cursor-pointer select-none hover:brightness-95 transition-all";

/** 紧凑下载按钮（红色渐变，与正文卡同色） */
export const dlMiniBtn =
	"dl-now shrink-0 inline-flex items-center justify-center gap-1 rounded-full " +
	"px-2.5 py-1.5 text-[0.7rem] font-semibold text-white " +
	"bg-gradient-to-r from-[#ff5b4a] to-[#e01b32] " +
	"hover:brightness-110 active:scale-[0.95] transition-all cursor-pointer " +
	"select-none whitespace-nowrap";
