# userscripts

这是一个个人收集的油猴脚本（Tampermonkey）仓库，主要用于增强 B 站等网站的浏览体验。

## 脚本列表

| 脚本名称 | 功能简介 | 安装方式 |
|---------|---------|---------|
| [B站动态UP主搜索](#b站动态up主搜索) | 在 B 站动态页快速搜索并切换关注的 UP 主，支持全站用户搜索 | 见脚本文件 |
| [DeepSeek-代码块跳转](#deepseek-代码块跳转) | 为 DeepSeek 网页版增加代码块跳转功能 | 见脚本文件 |
| [bilibili-homepage-ip-comment](#bilibili-homepage-ip-comment) | 在 B 站首页显示 IP 属地评论 | 见脚本文件 |

---

### B站动态UP主搜索

- **文件**：`B站动态UP主搜索/xxx.user.js`（根据实际文件名）
- **功能**：在 B 站动态页左侧 UP 主列表末尾添加搜索入口，支持模糊搜索关注用户，点击结果直接切换右侧动态；同时支持全站用户搜索，点击打开个人空间。
- **使用说明**：见该目录下的 `使用手册.md`。
- **特别说明**：脚本需在 `https://t.bilibili.com/` 下运行。

### DeepSeek-代码块跳转

- **文件**：`DeepSeek-代码块跳转/xxx.user.js`
- **功能**：为 DeepSeek 对话页面中的代码块添加一键跳转到顶部/底部的按钮（根据实际功能描述）
- **使用说明**：安装后刷新页面即可。

### bilibili-homepage-ip-comment

- **文件**：`bilibili-homepage-ip-comment/xxx.user.js`
- **功能**：在 B 站首页评论区显示用户 IP 属地（根据实际功能描述）
- **使用说明**：需要登录 B 站账号才能查看完整信息。

---

## 安装方法

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)（支持 Chrome、Edge、Firefox、Safari 等）。
2. 打开 Tampermonkey 管理面板，点击“新建脚本”。
3. 将对应脚本的代码复制粘贴进去，保存即可。
4. 脚本会自动在匹配的网站上生效，请刷新目标页面。

> 如果脚本发布在 Greasy Fork 等平台，也可以直接点击安装链接一键安装。

## 目录结构
