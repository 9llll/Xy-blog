/**
 * 下载卡片的样式类名
 *
 * 与 rehype-component-download.mjs（正文 ::download 指令）共用，
 * 避免样式在多处渲染路径上漂移。
 *
 * 新版为「封面式」卡片（左封面 + 标题/元信息 + 右侧胶囊按钮），
 * 普通下载 / 加密下载 / 付费下载共用同一外壳，仅配色与文案区分。
 *
 * 注意：Fuwari 使用 Tailwind v3，CSS 变量写法是 bg-[var(--primary)]，
 * 不能用 Tailwind v4 的 bg-(--primary) 简写。
 */

/* ===== 卡片外壳 ===== */

/** 整行卡片容器 */
export const dlCard =
	"dl-card flex items-center gap-3 sm:gap-4 rounded-2xl px-3 py-3 sm:px-4 sm:py-3.5 " +
	"bg-[var(--card-bg)] border border-[var(--line-divider)] shadow-sm " +
	"hover:border-[var(--primary-border-soft)] hover:shadow-md transition-all duration-200";

/** 左侧封面容器 */
export const dlCoverWrap =
	"dl-cover-wrap relative shrink-0 w-[88px] h-[64px] sm:w-[108px] sm:h-[76px] " +
	"rounded-xl overflow-hidden bg-[var(--btn-regular-bg)]";

/** 封面图 */
export const dlCover = "dl-cover w-full h-full object-cover";

/** 封面左上角标签（通用） */
export const dlCoverTag =
	"dl-cover-tag absolute left-1 top-1 rounded-full px-2 py-[1px] " +
	"text-[0.62rem] font-bold leading-tight shadow-sm";

/** 免费标签（绿） */
export const dlTagFree = "bg-[#22c55e] text-white";

/** 加密标签（主题色） */
export const dlTagLock = "bg-[var(--primary)] text-white";

/** 付费标签（琥珀色，和普通卡片同风格，不突兀） */
export const dlTagPay = "bg-[#f59e0b] text-white";

/** 右侧信息列 */
export const dlBody = "dl-body flex-1 min-w-0 flex flex-col gap-1";

/** 资源名称 */
export const dlTitle =
	"dl-title text-[0.95rem] sm:text-[1rem] font-bold leading-tight " +
	"text-black/90 dark:text-white/90 min-w-0";

/** 元信息行（网盘 / 提取码 / 大小） */
export const dlMetaRow =
	"dl-meta-row flex flex-wrap items-center gap-x-3 gap-y-1 " +
	"text-[0.75rem] leading-none text-black/50 dark:text-white/50";

/** 网盘小圆点 */
export const dlNdDot =
	"dl-nd-dot inline-block w-1.5 h-1.5 rounded-full shrink-0";

/** 网盘小图标（自定义图片时） */
export const dlNdImg = "dl-nd-img w-3.5 h-3.5 rounded object-contain shrink-0";

/** 提取码胶囊（可点击复制） */
export const dlCodeChip =
	"dl-code inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 " +
	"text-[0.72rem] text-[var(--primary)] bg-[var(--primary-soft)] " +
	"cursor-pointer select-none hover:bg-[var(--primary-soft-hover)] transition-colors";

/** 底部信息行（资源类型 + 简介） */
export const dlFoot =
	"dl-foot flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] leading-none";

/** 免费资源（绿） */
export const dlFootFree = "dl-foot-free font-semibold text-[#22c55e]";

/** 加密资源（主题色） */
export const dlFootLock = "dl-foot-lock font-semibold text-[var(--primary)]";

/** 付费资源（琥珀色） */
export const dlFootPay =
	"dl-foot-pay font-semibold text-[#d97706] dark:text-[#fbbf24]";

/** 简介 / 大小 */
export const dlFootDesc =
	"dl-foot-desc min-w-0 flex-1 truncate text-black/45 dark:text-white/45";

/** 右侧操作区 */
export const dlAction = "dl-action shrink-0";

/** 立即下载按钮（主题色胶囊） */
export const dlNowBtn =
	"dl-now inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 " +
	"text-[0.85rem] sm:text-[0.9rem] font-semibold text-white bg-[var(--primary)] shadow-sm " +
	"hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer select-none whitespace-nowrap";

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
	"dl-cover-tag absolute left-0.5 top-0.5 rounded px-1 py-[1px] " +
	"text-[0.5rem] font-bold leading-tight shadow-sm";

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

/** 操作行 */
export const dlMiniFoot =
	"dl-mini-foot flex items-center justify-between gap-1.5 min-w-0";

/** 紧凑提取码（可点击复制） */
export const dlMiniCode =
	"dl-code inline-flex min-w-0 items-center gap-0.5 rounded-md px-1.5 py-1 " +
	"text-[0.65rem] text-[var(--primary)] bg-[var(--primary-soft)] " +
	"cursor-pointer select-none hover:bg-[var(--primary-soft-hover)] transition-colors";

/** 紧凑下载按钮 */
export const dlMiniBtn =
	"dl-now shrink-0 inline-flex items-center justify-center gap-1 rounded-full " +
	"px-2.5 py-1.5 text-[0.7rem] font-semibold text-white bg-[var(--primary)] " +
	"hover:brightness-110 active:scale-[0.95] transition-all cursor-pointer " +
	"select-none whitespace-nowrap";

/* ===== 付费卡片（复用同一外壳，仅角标/价格区分） ===== */

export const dlPayBadge =
	"dl-pay-badge shrink-0 grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl " +
	"bg-[#f59e0b] text-white shadow-sm";

export const dlPayLock =
	"dl-pay-lock inline-flex items-center gap-0.5 rounded-md " +
	"bg-[#f59e0b]/15 px-1.5 py-0.5 text-[0.65rem] font-bold " +
	"text-[#b45309] dark:text-[#fbbf24] border border-[#f59e0b]/30 shrink-0 align-middle";

export const dlPayBtn =
	"dl-pay-btn inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 " +
	"text-[0.85rem] sm:text-[0.9rem] font-bold text-white " +
	"bg-[var(--primary)] shadow-sm hover:brightness-110 active:scale-[0.97] " +
	"transition-all cursor-pointer select-none whitespace-nowrap";
