# Trippo — 旅行计划小程序

> 小红书/Ins 风格 · 毛玻璃设计 · AI 解析攻略 → 精美旅行计划

## 快速了解

- **技术栈：** 微信小程序原生 (WXML/WXSS/JS) + CloudBase 云开发 + DeepSeek API
- **环境 ID：** `cloud1-d9gr38v2je3c6e3c7`
- **启动：** 微信开发者工具打开此目录 → 编译预览
- **详细文档：** [HANDOFF.md](./HANDOFF.md)

## 设计语言（改代码前必读）

**Ins风 · 暖调毛玻璃：**
- 所有页面背景：`linear-gradient(175deg, #F5F1E8, #FEFCF5, #F8F4EC)`
- 卡片：`rgba(255,255,255,0.35)` + `backdrop-filter: blur(20px)` + `border: 1px solid rgba(255,255,255,0.5)`
- 圆角统一 20-24rpx，阴影用双层柔阴影
- 按钮小巧 (padding 20-24rpx)，主色 `#5C8F7A`（鼠尾草绿），辅色 `#C4A265`（暖金）
- 少用 emoji 装饰，只用功能性 emoji
- 排版：大留白 (40rpx 页边距)、letter-spacing、opacity 层次

## 关键文件

| 文件 | 用途 |
|------|------|
| `app.wxss` | CSS 变量 + 全局按钮/卡片/布局 |
| `pages/index/` | 首页 — 旅行列表 + 新建入口 |
| `pages/import/` | 从帖子导入 — 剪贴板识别 + AI 解析（核心功能） |
| `pages/trip/detail/` | 详情页 — 最复杂的页面 |
| `pages/trip/edit/` | 编辑页 — 分段可折叠表单 |
| `utils/api.js` | 数据库 CRUD |

## 常用操作

- 改样式：先读 `app.wxss` 了解变量体系，再改目标页面的 wxss
- 加页面：在 `app.json` 注册路由，在 `pages/` 下建目录
- 改 AI prompt：`pages/import/index.js` 的 `SYSTEM_PROMPT` 常量
- 改次数限制：`cloudfunctions/checkUsage/index.js`
- 部署云函数：微信开发者工具右键云函数目录 → 上传并部署

## 注意事项

- 无 innerHTML，用 `wx:if`/`wx:for` + `{{}}` 数据绑定
- 单位用 rpx (750rpx = 屏幕宽)
- `backdrop-filter` 部分安卓不支持，用半透明背景兜底
- DeepSeek API Key 在前端代码 `pages/import/index.js` 第 8 行
