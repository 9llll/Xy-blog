---
title: 【文档】自定义指令说明：按钮与视频
description: 本站 Markdown 扩展语法的总览：::btn 链接按钮、::video 视频播放器、::gallery 图片网格，以及下载卡片、文章引用等其它指令的入口。
published: 2026-10-06
updated: 2026-11-24
tags:
  - 指令
  - 按钮
  - 视频
  - 教程
category:
  - 教程文档/说明
kind: news
image: images/shipin.avif
keywords:
  - Markdown 自定义指令，::btn 按钮指令，::video 视频指令，::gallery 图片网格，Markdown 扩展语法教程
author: 羡鱼
series: 指令
seriesOrder: 1
ogImage: https://www.3x3.top/images/xy2.avif
draft: false
pinned: false
comment: true
---
本文介绍 `::btn`（链接按钮）、`::video`（视频播放器）、`::gallery`（图片网格）三个指令的用法。所有示例都是真实可用的。

::video{platform="bilibili" bvid="BV1ZN4y1f7p6" title="视频嵌入示例"}

## 一、::btn 链接按钮

### 基本用法

```md
::btn{href="https://example.com" text="点我跳转"}
```

渲染效果：

::btn{href="https://example.com" text="点我跳转" icon="arrow"}

### 参数说明

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `href` | 是 | 链接地址。支持 `http(s)://` 开头，或以 `/`、`./`、`../` 开头的站内相对路径 |
| `text` | 是 | 按钮上显示的文字（也兼容 `title` / `label`） |
| `variant` | 否 | 按钮样式，见下方变体表。默认 `primary` |
| `icon` | 否 | 图标名，见下方图标表。不填则不显示图标 |
| `target` | 否 | 链接打开方式。`blank` 表示新窗口打开（自动补 `rel="noopener noreferrer"`），默认当前窗口 |
| `block` | 否 | 传 `true` 则按钮独占一行（宽度 100%） |

> `href` 只接受 `http(s)` 与站内相对路径。像 `javascript:` 这类协议会被直接拒绝，不会渲染出按钮——这是为了防止在文章里埋入可执行脚本。

### 样式变体

| `variant` | 效果 |
| --- | --- |
| `primary` | 实心主色（默认） |
| `secondary` | 浅底主色 |
| `outline` | 描边 |
| `ghost` | 无边框，悬停才显形 |

四个变体放在一起对比：

::btn{href="https://example.com" text="主要" variant="primary" icon="download"}

::btn{href="https://example.com" text="次要" variant="secondary" icon="external"}

::btn{href="https://example.com" text="描边" variant="outline" icon="arrow"}

::btn{href="https://example.com" text="幽灵" variant="ghost" icon="star"}

### 图标

`icon` 支持以下取值（也支持包含这些关键字的其他写法，如 `icon="fa-download"` 会被识别为下载图标）：

| 图标名 | 用途 |
| --- | --- |
| `download` | 下载 |
| `external` | 站外链接 |
| `arrow` | 箭头 |
| `play` | 播放 |
| `link` | 链接（默认兜底） |
| `check` | 完成 |
| `info` | 信息 |
| `star` | 收藏 |

实际效果：

::btn{href="https://example.com" text="下载" variant="secondary" icon="download"}

::btn{href="https://example.com" text="外部链接" variant="secondary" icon="external"}

::btn{href="https://example.com" text="前往" variant="secondary" icon="arrow"}

::btn{href="https://example.com" text="播放" variant="secondary" icon="play"}

::btn{href="https://example.com" text="链接" variant="secondary" icon="link"}

::btn{href="https://example.com" text="完成" variant="secondary" icon="check"}

::btn{href="https://example.com" text="说明" variant="secondary" icon="info"}

::btn{href="https://example.com" text="收藏" variant="secondary" icon="star"}

### 其它用法

**新窗口打开**

::btn{href="https://example.com" text="新窗口打开" variant="primary" target="blank" icon="external"}

**独占一行**（移动端尤其有用）

::btn{href="https://example.com" text="这个按钮独占整行" variant="primary" block="true" icon="download"}

**指向站内文件**

```md
::btn{href="/downloads/demo.zip" text="下载示例包" variant="primary" icon="download"}
```

## 二、::video 视频播放器

### 基本用法

```md
::video{platform="bilibili" bvid="BV1fK4y1s7Qf" title="示例视频"}
```

> **交互说明**：视频默认不加载播放器。页面上先显示「封面 + 播放按钮」，点一下才会真正加载 B 站 / YouTube 播放器并开播。这样首屏更轻，也不会出现「看不到播放按钮 / B 站登录弹窗挡住」的问题。B 站封面在构建时自动抓取，也可以用 `poster` 指定。

### 参数说明

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `src` | 视情况 | 视频地址。本地路径、远程视频文件、或第三方嵌入地址 |
| `platform` | 否 | `youtube` 或 `bilibili`，配合 `id` / `bvid` 使用 |
| `id` | 视情况 | 平台视频 ID（YouTube 用） |
| `bvid` | 视情况 | 平台视频 ID（B 站用） |
| `title` | 否 | 视频标题，显示在播放器下方 |
| `poster` | 否 | 本地视频的封面图地址 |
| `ratio` | 否 | 宽高比，默认 `16/9`，可写 `4/3`、`1/1` 等 |
| `autoplay` | 否 | 传 `true` 自动播放（仅本地视频可靠） |
| `loop` | 否 | 传 `true` 循环播放 |
| `muted` | 否 | 传 `true` 静音播放 |

### 三种来源

**① B 站** —— 给 `bvid`

```md
::video{platform="bilibili" bvid="BV1fK4y1s7Qf" title="B 站视频"}
```

**② YouTube** —— 给 `id`

```md
::video{platform="youtube" id="5gIf0_xpFPI" title="YouTube 视频"}
```

**③ 第三方嵌入地址** —— 直接给 `src`

```md
::video{src="https://www.youtube.com/embed/5gIf0_xpFPI" title="直接给嵌入地址"}
```

### 本地视频文件

把视频放进 `public/videos/` 目录，用 `src` 指向它：

```md
::video{src="/videos/demo.mp4" title="本地视频示例"}
```

也可以指定封面与宽高比：

```md
::video{src="/videos/demo.mp4" title="4:3 视频" poster="/images/cover.avif" ratio="4/3"}
```

> 仓库里没有预置样例视频，所以这里只给代码示例，不做实际渲染。

### 关于宽高比

播放器外层是固定宽高比的容器，宽度跟随正文栏，高度按比例缩放。默认 `16/9`，竖屏视频可以改成 `9/16`：

```md
::video{src="/videos/vertical.mp4" title="竖屏视频" ratio="9/16"}
```

## 三、::gallery 图片网格

把多张图片放进 `::gallery` 容器，会渲染成等宽网格，点击任意一张全屏放大（复用站内 PhotoSwipe 灯箱，无需配置）。

```md
::gallery
![说明文字1](images/01.avif)
![说明文字2](images/02.avif)
![说明文字3](images/03.avif)
::
```

| 要点 | 说明 |
| --- | --- |
| 布局 | 手机 2 列，屏幕宽度 ≥768px 自动变 3 列 |
| 灯箱 | 自动接入 PhotoSwipe，点击放大、滚轮缩放、点击关闭 |
| 图片 | 和正文图片一样放在 `src/content/posts/images`，CMS 里插入即可 |
| 空块 | 指令内没有任何图片时，不渲染任何内容 |

注意它是**容器指令**：开头 `::gallery` 和结尾 `::` 各占一行，图片写在中间。

## 四、写在正文里的注意事项

### 指令必须独占一行

所有 `::xxx{...}` 指令都要**单独占一行**，前后留空行。写在句子中间会被当成普通文本。

```md
正确：

::btn{href="https://example.com" text="点这里"}

错误：

请点 ::btn{href="https://example.com" text="这里"} 前往
```

### 参数值里的引号

属性值必须用**英文半角双引号** `"` 包起来，值里不能再出现双引号。中文引号 `“”` 不识别。

### 属性的顺序无所谓

`::btn{text="点我" href="https://example.com"}` 和 `::btn{href="https://example.com" text="点我"}` 等价。

### 不要放进代码块

放进代码块（三个反引号围起来的部分）只会原样显示文字，不会渲染。本文里那些灰底块就是代码块，故意用来展示写法。

## 五、其它可用指令

| 指令 | 用途 |
| --- | --- |
| `::download{...}` | 下载卡片，支持网盘提取码、访问密码、付费购买。**推荐改用后台「下载资源」表单填写**，不用记语法，详见文末引用的使用说明 |
| `::post{id="..."}` | 在文章里引用另一篇文章的卡片，`id` 就是对方文章的 slug（URL 里的那一段） |
| `::github{repo="owner/repo"}` | GitHub 仓库卡片，数据在页面打开时从 GitHub API 拉取 |
| `:::note` / `:::tip` / `:::important` / `:::caution` / `:::warning` | 提示框。容器形式，开头一行 `:::tip`，内容写在中间，结尾一行 `:::` |

## 六、样式与实现位置

按钮、视频、图集的外观都集中在两个文件里，改一处全站生效：

| 文件 | 作用 |
| --- | --- |
| `src/utils/embed-styles.ts` | 按钮、视频、图集的样式（尺寸、圆角、配色、间距） |
| `src/utils/download-styles.ts` | 下载卡片的样式 |
| `src/plugins/rehype-component-btn.mjs` | `::btn` 的渲染与参数校验 |
| `src/plugins/rehype-component-video.mjs` | `::video` 的渲染与参数校验 |
| `src/plugins/rehype-component-gallery.mjs` | `::gallery` 的渲染 |
| `src/plugins/remark-directive-hname.mjs` | 指令名与 HTML 标签冲突的处理 |

按钮用的是主题色变量（`--primary` / `--primary-soft`），所以在 `src/config.ts` 里改主题色，所有按钮会自动跟着变。

## 七、文章字段：系列与 SEO

文章 Frontmatter 里这几个字段在 Pages CMS 的「文章」编辑页也能填：

| 字段 | 作用 |
| --- | --- |
| `keywords` | 页面 `<meta name="keywords">` 与结构化数据关键词 |
| `author` | 覆盖站点默认作者名，写入 `<meta name="author">` 与 JSON-LD |
| `series` | 系列名称；填写后文章底部出现「系列文章」导航（上一篇 / 下一篇） |
| `seriesOrder` | 同系列内的排序，数字越小越靠前 |
| `ogImage` | 社交分享图，建议填完整 `http(s)` 链接，用于微信 / Twitter 卡片 |

本文这一组三篇都是 `series: 指令`，所以文末能看到「上一篇 / 下一篇」。

**两类「封面」不是一回事**：列表页的缩略图取 `image` 字段，没填则用正文第一张图，再没有就调随机封面 API；社交分享用的图取 `ogImage`，没填则由 `image` 兜底。两者可以不一样，但建议同主题。

---

下载卡片的完整写法（含后台表单格式）见这篇：

::post{id="download-guide"}
