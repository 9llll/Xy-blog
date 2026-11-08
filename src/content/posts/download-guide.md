---
title: 【文档】下载按钮使用说明
description: 如何在文章任意位置插入下载按钮，支持网盘提取码与独立密码保护
published: 2026-10-01
updated: 2026-10-01
tags:
  - 下载按钮
  - 教程
  - 指令
category:
  - 教程文档
image: images/wendang.avif
keywords:
  - ::download 下载按钮，Markdown 下载指令，羡鱼资源下载按钮，静态站下载按钮，Markdown 资源下载按钮教程
author: 羡鱼
series: 指令
seriesOrder: 0
ogImage: https://www.3x3.top/images/fenxiang.avif
draft: false
pinned: false
comment: true
---
在文章正文里用 `::download{...}` 指令即可插入下载按钮，**可以放在文章任意位置**（标题下、正文中间、末尾都行）。

## 最简用法

```markdown
::download{title="羡鱼资源" url="https://github.com/9llll/Xy-blog"}
```

## 支持的属性


| 属性 | 说明 | 示例 |
| ---------- | ---------------------------------------------- | ----------------------- |
| `url` | **必填**，下载地址。必须是 http(s) 或 `/` 开头的站内路径 | `"/downloads/demo.zip"` |
| `title` | 资源名称（`name` 为同义别名） | `"示例包"` |
| `desc` | 资源简介（`source` 为同义别名，兼容旧写法） | `"合集资源，持续更新"` |
| `size` | 文件大小 | `"12.4 MB"` |
| `code` | 网盘提取码，点击一键复制 | `"a1b2"` |
| `hint` | 密码提示，仅在设置密码时有意义 | `"提示：四位数字"` |
| `password` | 访问密码，独立于文章密码 | `"1234"` |
| `icon` | 图标：网盘关键字（`baidu`/`quark`/`aliyun`/`123`/`lanzou`/`tianyi`/`xunlei`/`chengtong`/`cowtransfer`/`weiyun`…）、通用类型（`zip`/`image`/`file`/`lock`/`key`）、或图片地址 / emoji（自定义） | `"baidu"` |


## 完整示例

```markdown
::download{title="带提取码的下载" desc="示例：网盘资源需要提取码" size="12.4 MB" code="a1b2" url="https://example.com/file.zip"}

::download{title="加密的下载" desc="示例：需要密码才能下载" size="8.6 MB" password="1234" hint="提示：四位数字" url="https://example.com/secret.zip"}
```

## 密码保护是怎么工作的

填写 `password` 后：

1. **构建期**把明文密码转成 SHA-256 哈希，写入 HTML 的 `data-dl-hash` 属性
2. **运行时**用 WebCrypto 计算你输入密码的哈希，与之比对
3. 明文密码**不会出现在任何输出文件**中，查看网页源码也看不到

需要注意：这是**访问门禁**而非强加密。校验发生在浏览器端，理论上仍可被绕过。纯静态站点没有后端，做不到真正的服务端鉴权——若需要彻底控制，请配合 Cloudflare Pages Functions 做中转。

## 地址混淆

下载地址在构建期会被 **Base64 编码**后写入 `data-dl-url`，所以：

- 查看网页源码 / F12 Elements 里**搜不到**真实下载地址
- 但点击下载的瞬间，浏览器 Network 面板仍会显示真实地址

这是混淆而非加密，目的是防止地址被批量采集。

## 网盘品牌图标

下载地址如果是常见网盘（百度网盘 / 夸克 / 阿里云盘 / 123 网盘 / 蓝奏云 / 天翼云 / 迅雷 / 城通 / 奶牛 / 微云 / 360 / 115 / PikPak 等），**无需任何配置**，左侧徽章会自动显示对应网盘的品牌色圆牌（按链接域名识别）：

::download{title="百度网盘（自动识别）" desc="pan.baidu.com 自动显示百度蓝圆牌" size="1.2 GB" code="8888" url="https://pan.baidu.com/s/1DemoBaiduAutoDetect"}

::download{title="蓝奏云（自动识别）" desc="lanzou 域名自动显示蓝奏云圆牌" size="30 MB" url="https://8x8.lanzout.com/DemoLanzouAuto"}

手动指定网盘（覆盖自动识别，或用于非网盘地址）：

::download{title="手动指定夸克" icon="quark" desc="icon=quark 手动指定" size="800 MB" url="https://example.com/quark-file"}

自定义图标：填图片地址渲染图片，填 emoji / 文字渲染文字：

::download{title="自定义 emoji 图标" icon="💾" desc="icon 填 emoji" size="10 MB" url="https://example.com/file-emoji"}

::download{title="自定义图片图标" icon="https://www.3x3.top/images/fenxiang.avif" desc="icon 填图片地址" size="10 MB" url="https://example.com/file-img"}

## 常见问题

**Q：按钮没显示？**
A：检查属性是否用英文半角引号 `"`，不要用中文全角引号 `“”`；`::` 后面不要加空格；指令要单独成段，不要放在代码块里。

**Q：密码填对了还是提示错误？**
A：确认密码前后没有多余空格（两端空格会被自动去除，但中间的会保留）。

**Q：点击下载会跳走离开本站？**
A：跨域地址会在新标签页打开（因为浏览器对跨域链接会忽略 `download` 属性），站内路径则直接下载。当前页面不会丢失。