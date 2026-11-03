---
title: 【单机】【修仙西游 AI修复一键端】160阶仙器+烧香+10000坐骑端
description: |-
  一键启动、关闭，自带GM工具，想要什么自己发，仙器增加100-160阶【实测伤害破亿】
  召唤兽升星，陪玩机器人（实际是机器人自己组队在完成各种任务）、新增三种坐骑丹根骨、灵性、力量（不限次数每次增加5点坐骑属性），宠物也能起飞！
  带一份玩法攻略，因为加了100-160阶仙器，所有仙器属性面板让Ai重新调了一下，如果想增加可玩性可调低仙器属性，其他细节没有测试，还有BUG大家自行研究，小问题可以让Ai修。
published: 2026-11-03
updated: 2026-11-03
tags:
  - 单机游戏
  - 怀旧游戏
  - 解压即玩
  - 大话2
category:
  - 游戏资源
image: images/xxxy/xxxy7.avif
author: 羡鱼
series: 回合制
seriesOrder: 0
ogImage: https://raw.githubusercontent.com/9llll/Xy-blog/refs/heads/main/src/content/posts/images/xy2.avif
draft: false
pinned: false
comment: true
---
::download{name="【🔑免费资源】**修仙西游 AI修复一键端**" url="https://pan.baidu.com/s/1TeIR7zrnMl6as3MhCGtQ5Q" desc="**【修仙西游 ai修复一键端】160阶仙器+烧香+10000坐骑端**" code="8888" size="4.2 GB" icon="zip"}

![版本截图三](images/xxxy/xxxy1.avif)

![版本截图三](images/xxxy/xxxy2.avif)

![版本截图三](images/xxxy/xxxy3.avif)

![版本截图三](images/xxxy/xxxy4.avif)

![版本截图三](images/xxxy/xxxy5.avif)

![版本截图三](images/xxxy/xxxy6.avif)

![版本截图三](images/xxxy/xxxy7.avif)

更新： 新增秒10特技升级包，把升级包解压到根目录，启动完游戏，再去build启动GM工具，输入角色ID就可以发放当前装备在身上的武器同款秒10的装备

一键启动、关闭，自带GM工具，想要什么自己发，仙器增加100-160阶【实测伤害破亿】

召唤兽升星，陪玩机器人（实际是机器人自己组队在完成各种任务）、新增三种坐骑丹根骨、灵性、力量（不限次数每次增加5点坐骑属性），宠物也能起飞！

带一份玩法攻略，因为加了100-160阶仙器，所有仙器属性面板让Ai重新调了一下，如果想增加可玩性可调低仙器属性，其他细节没有测试，还有BUG大家自行研究，小问题可以让Ai修。



双击「启动游戏.bat」即可进游戏，不需要装 Java / Redis / H2 / Tomcat，



也不需要网络。包里自带 Java 8（build\jre，1.8.0_181 64 位）。



&nbsp;

怎么用？



---



1. 双击  PLAY.bat

  它是这次改版后的"唯一窗口"：Redis、H2、Tomcat/GameServer 全部

     以隐藏窗口方式拉起，输出重定向到 build\logs\server-console.log，

     任务栏不会再堆一排黑窗格。整个启动过程只有这一个面板窗口，

     加上随后的游戏客户端窗口。
  2. 等待面板启动  "game server is up."
  
    第一次冷启动要读约 268 张配置表，正常耗时 30~90 秒，
  
     这期间脚本会一直显示等待，不是卡死。
  
     （war 包已经不在 webapps 里了，Tomcat 不再重复解包，
  
       启动时间从 ~57 秒降到 ~15 秒，详见第七节。）
  3. 服务端就绪后，面板自动拉起游戏客户端窗口。
  4. 客户端首屏选服页 —— 点【已建号服务器】那张卡片，进入。
  5. 账号  xyxylocal1      密码  xyxy1234
  
    选角色 吕引溶，即可进入游戏。
  
     （这是已有 102 级角色的老账号，进去就能看到内容。）
  
    己建号：账号  qodernew001   密码  qoder1234
  
    下角色 0 级，可以体验从新号开始的完整流程。）
  
    菜单（服务起来之后一直停在这里，不会自己退）：
  
      C  再开一个游戏客户端窗口
  
      M  打开本地 GM 便捷操作工具（自动登录，什么都不用输）【推荐】
  
      G  用默认浏览器打开本地 GM 面板 gm.html（要手输账号口令）
  
      L  打印服务端日志最后 30 行（已按 GBK 解码，中文可读）
  
      W  实时跟随服务端日志，Ctrl+C 结束
  
      S  把死掉的 Redis / H2 / GameServer 补起来
  
      X  优雅停服并关闭面板（等同 stop-all.bat）
  
      Q  只关面板，服务继续留着
  
      H  重新打印这份菜单
  
    ：面板里按  X，或双击  stop-all.bat
  
    op-all.bat 会先请求 Tomcat 正常关机，再最多等 90 秒，
  
    GameServer 把 Redis 里的热数据回写进 H2 才收尾——实测停服日志：
  
      开始同步玩家数据本次数量:10 … 同步10条人物数据用时:24
  
      开始同步数据库本次数量:28 … 同步28条物品数据用时:57
  
    别直接关窗口或 taskkill 强杀，那会吞掉这段还没落库的数据。
  
    本机已经把 server.redis 从作者的 1 改成 0：每次启动都用数据库重建
  
    dis 缓存，所以重启后背包/伙伴/召唤兽不会再"凭空变空"
  
    在控制面板里按 X。停止脚本会先等 GameServer 把内存数据刷回数据库。

换电脑要注意的



---



· 放哪个盘都行，路径可以带中文带空格（原始机器上就是这种路径，验证过）。



  但别放 C:\Program Files 下 —— 服务端要往自己的目录写文件（GetTXT），需要写权限。



· 先跑「自检.bat」。全 PASS 就直接双击「启动游戏.bat」。



· 4 个端口 6379/9092/7100/8083 必须空着，自检会告诉你被谁占了。



· 只允许一份同时在跑。想同时跑两份，得改端口和连接串，不建议。



· 存档 = build\GameServer\datagamedb.mv]([http://gamedb.mv).db](http://gamedb.mv).db) 这一个文件（几 MB）。



  换机/备份只拷它也行；打包时顺手生成了一个 gamedb-portable-save-*.zip 快照。



· Redis 在这个包里是不落盘的（appendonly no / save ""），进度都存在 H2 里，



  所以关掉 Redis 不会丢东西，这是设计如此。



· 千万别在任何启动脚本里加 -Dfile.encoding=UTF-8。服务端下行用 JVM 默认字符集



  加密，客户端固定按 GB2312 解，强制 UTF-8 会让所有中文变乱码、npc.txt 解析失败、



  场景加载不出来。



· 杀毒软件可能提示 redis-server.exe / java.exe：这两个都是本包自带的，



  只绑定 127.0.0.1，不对外网。放行即可，不要从网上另下。



&nbsp;

· 第一次在本机启动时，Windows 防火墙会弹窗问「是否允许 Java(TM) Platform SE



  binary 访问网络」—— 那是包里的 build\jre\bin\java.exe（游戏自带的 Java，



  不是从网上下的）。点「允许」就行；就算点「取消」也不影响本机游玩，



  因为服务端和客户端都在 127.0.0.1 上互连，回环流量不过防火墙。



  redis-server.exe 如果也弹，同样点允许。



· 这个包是打包那一刻的存档快照（看 gamedb-portable-save-*.zip 的时间戳）。



  原机和便携包的进度互不同步：各玩各的。想把一边的进度带到另一边，



  就在停机状态下拷 build\GameServer\datagamedb.mv]([http://gamedb.mv).db](http://gamedb.mv).db) 这一个文件。



· 包里保留了开发期的测试账号和角色（几个自建号、10000001-10000004 等），



  不影响玩；要一个干净存档再说。

