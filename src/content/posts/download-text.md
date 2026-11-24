---
title: 【文档】下载按钮演示
description: 本站下载卡片的真实渲染效果：免费直链、网盘提取码、访问密码、付费购买四种状态，以及网盘自动识别与自定义图标。
published: 2026-10-01
updated: 2026-11-24
tags:
  - 下载按钮
  - 演示
  - 教程
category:
  - 教程文档/演示
kind: news
image: images/wendang.avif
keywords:
  - 下载卡片演示，网盘提取码，访问密码，付费资源卡片，网盘自动识别
author: 羡鱼
series: 指令
seriesOrder: 3
ogImage: https://www.3x3.top/images/fenxiang.avif
draft: false
pinned: false
comment: true
---
这一页只做**渲染效果预览**，卡片都是真实渲染出来的（付费卡的购买链接是占位地址，点了会打不开）。具体怎么写、有哪些属性、密码怎么保护，都在文末那张卡片指向的《下载按钮使用说明》里，这里不重复。

## 一、四种基本状态

**免费直链**（无提取码、无密码，点击直接下载）

::download{name="免费资源" desc="无提取码、无访问密码，点一下直接下载" size="12.4 MB" url="https://www.3x3.top"}

**网盘提取码**（按钮左侧显示提取码，点一下复制）

::download{name="网盘资源（带提取码）" desc="提取码紧贴下载按钮，点一下写入剪贴板" size="1.2 GB" code="8888" url="https://pan.baidu.com/s/1DemoBaiduAutoDetect"}

**访问密码**（点击弹出密码框，最多试 3 次）

::download{name="加密资源" desc="需要访问密码才能拿到真实地址" size="8.6 MB" password="66398" hint="提示：五位数字" url="https://www.3x3.top/secret.zip"}

**付费资源**（卡片不含任何地址，只跳转发卡平台）

::download{name="付费资源（演示）" desc="购买链接为占位地址，非真实商品" size="1.2 GB" pay="DEMO001" price="19.9" buy="https://example.com/buy/DEMO001"}

## 二、网盘自动识别

链接域名能认出来的网盘，品牌色圆点和网盘名会自动出现，不用填 `icon`：

::download{name="百度网盘" desc="pan.baidu.com 自动识别" size="1.2 GB" code="8888" url="https://pan.baidu.com/s/1DemoBaiduAutoDetect"}

::download{name="蓝奏云" desc="lanzou 域名自动识别" size="30 MB" url="https://8x8.lanzout.com/DemoLanzouAuto"}

::download{name="夸克网盘（手动指定）" desc="icon=quark 覆盖自动识别" size="800 MB" icon="quark" url="https://example.com/quark-file"}

## 三、自定义封面与角标

封面默认取文章第一张图，角标默认显示「免费」或「加密」，两者都可以单独指定：

::download{name="自定义封面与角标" desc="cover 指定封面，tag 指定角标文字" tag="独家" cover="/images/fenxiang.avif" size="666 MB" url="https://www.3x3.top"}

## 四、三种卡片混排

同一篇文章里可以并排放，互不干扰：

::download{name="免费预览包" desc="直接下载" size="120 MB" url="https://www.3x3.top"}

::download{name="会员加密包" desc="需要访问密码" size="900 MB" password="abcd1234" url="https://www.3x3.top/member.zip"}

::download{name="付费完整包" desc="跳转发卡平台" size="1.5 GB" pay="DEMO002" price="29.9" buy="https://example.com/buy/DEMO002"}

---

字段怎么填，看这一篇：

::post{id="download-guide"}
