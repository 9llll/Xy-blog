---
title: 【文档】下载按钮使用说明
description: 如何在文章任意位置插入下载按钮，支持网盘提取码、独立密码保护与付费资源卡片
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
| `url` | 普通 / 加密下载**必填**；付费卡片不要填。必须是 http(s) 或 `/` 开头 | `"/downloads/demo.zip"` |
| `title` | 资源名称（`name` 为同义别名） | `"示例包"` |
| `desc` | 资源简介（`source` 为同义别名，兼容旧写法） | `"合集资源，持续更新"` |
| `size` | 文件大小 | `"12.4 MB"` |
| `code` | 网盘提取码，点击一键复制 | `"a1b2"` |
| `hint` | 密码提示，仅在设置密码时有意义 | `"提示：四位数字"` |
| `password` | 访问密码，独立于文章密码 | `"1234"` |
| `icon` | 图标：网盘关键字（`baidu`/`quark`/`aliyun`/`123`/`lanzou`/`tianyi`/`xunlei`/`chengtong`/`cowtransfer`/`weiyun`…）、通用类型（`zip`/`image`/`file`/`lock`/`key`）、或图片地址 / emoji（自定义） | `"baidu"` |
| `pay` | 付费卡片开关，填商品编号即可；填了之后卡片**不会**输出任何下载地址 | `"SKU001"` |
| `buy` | **付费时必填**，发卡平台商品购买页链接（http(s)） | `"https://发卡平台/商品"` |
| `price` | 价格，显示在购买按钮上 | `"19.9"` |
| `buyText` | 自定义按钮文字（可选） | `"立即下单"` |


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

> ⚠️ **公开仓库警示**：本站源码托管在公开 GitHub 仓库，`src/content/posts/*.md` 可被任何人通过 `raw.githubusercontent.com` 直接读取。写在 `password` / `url` / `code` 里的内容虽然在**构建产物**中不可见，但在**源仓库**里是公开的。因此这套机制只能防「顺手扒页面」，**不能用来保护付费资源**。付费请走下面的「付费下载」，把地址和卡密放到发卡平台。

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

## 付费下载（卡密 / 发卡平台）

付费资源**不要**把真实地址或卡密写进文章——仓库是公开的，写进去等于直接公开。

正确做法是把**下载地址 / 提取码 / 卡密**填到第三方发卡平台（XorPay、虎皮椒、易支付、独角数卡、爱发电等）的商品「发货内容」里，用户付款后由平台自动发货；本站只展示购买入口。

下面这张就是付费卡片的**真实渲染效果**（黑金配色，点击在新标签页打开示例购买页）：

::download{title="示例付费资源（效果预览）" desc="付费卡片真实渲染效果，非真实商品" size="1.2 GB" pay="DEMO001" price="19.9" buy="https://example.com/buy/DEMO001"}

完整语法如下（下方代码块展示写法，不会渲染成卡片）：

```markdown
::download{title="完整源码包" desc="含全部源码、素材与持续更新" size="1.2 GB" pay="SKU001" price="19.9" buy="https://faka.example.com/items/SKU001"}
```

会渲染成一张和其它下载卡片样式一致的「付费资源」卡片，右侧是购买按钮，点击在新标签页打开发卡平台。**卡片里不含任何下载地址、提取码或密码**，HTML / RSS / 接口 / 搜索索引里也都没有。

::download{title="付费完整包（演示）" desc="演示卡片，购买链接为占位地址" size="1.2 GB" pay="DEMO001" price="19.9" buy="https://example.com/buy/DEMO001"}

### 同一篇文章混排三种下载

```markdown
::download{title="免费预览包" url="https://example.com/preview.zip"}

::download{title="会员加密包" password="abcd1234" url="https://example.com/member.zip"}

::download{title="付费完整包" pay="SKU001" price="19.9" buy="https://faka.example.com/items/SKU001"}
```

每条指令独立渲染，互不干扰：免费块直接下载、加密块输密码解密、付费块跳转发卡平台。

### 为什么不用「购买后输卡密解密」

看起来更站内化的做法是把卡密当 `password`，复用现有加密下载机制在购买后解密。但卡密必须先写进文章才能在构建期加密 URL，而文章在公开仓库里 —— **卡密和地址会一起泄露**。要做成真卡密，得把密钥挪进 CI Secrets 并改造构建流程（已接近服务端方案），个人站起步阶段不划算。

> 极简替代：不需要卡片样式的话，直接用 `::btn{text="购买完整包 ¥19.9" href="发卡链接"}` 也完全可行，零配置。

## 常见问题

**Q：按钮没显示？**
A：检查属性是否用英文半角引号 `"`，不要用中文全角引号 `“”`；`::` 后面不要加空格；指令要单独成段，不要放在代码块里。

**Q：密码填对了还是提示错误？**
A：确认密码前后没有多余空格（两端空格会被自动去除，但中间的会保留）。

**Q：点击下载会跳走离开本站？**
A：跨域地址会在新标签页打开（因为浏览器对跨域链接会忽略 `download` 属性），站内路径则直接下载。当前页面不会丢失。