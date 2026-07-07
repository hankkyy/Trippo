# Trippo 项目交接文档

> 最后更新: 2026-07-07 | 完成阶段: Phase 1-7（Phase 6 仅剩真机测试&审核准备）

---

## 一、项目概述

**Trippo** — 通用旅行计划小程序，面向全球目的地。用户从模板库选择模板（或从空白开始），快速创建精美旅行计划，一键分享给微信好友。

**一句话定位：** 「再也不用在备忘录里写攻略了，这个小程序自动生成超美的旅行计划页✨」

**技术栈：** 微信原生小程序框架 (WXML + WXSS + JS) + 腾讯云 CloudBase（云开发）+ DeepSeek API（AI 智能解析）

**CloudBase 环境：** `cloud1-d9gr38v2je3c6e3c7`（个人版免费）

**小程序 AppID：** 待填入（当前 `project.config.json` 中为占位值）

**项目路径：** `/Users/hankzhang/Desktop/trippo-miniapp/`

**设计参考：**
- `/Users/hankzhang/Desktop/hanoi-vercel/index.html` — UI 组件和设计语言参考（设计系统通用，可适配任意目的地）
- 参考页面在线：https://hankzhang.cloud/

---

## 二、用户产品需求

### 核心用户故事
1. 普通游客打开小程序，无需注册/登录（微信自动鉴权）
2. 从模板库选择一个旅行模板（或从空白开始）
3. **在小红书/公众号看到好攻略 → 复制链接 → 打开 Trippo → 自动识别 → 一键 AI 生成旅行计划**
4. 在小程序内填写/修改旅行信息（航班、酒店、行程、餐厅等）
5. 得到一个精美的旅行计划页面
6. 一键分享给微信好友（对方打开直接看，无需登录）
7. 代码开源在 GitHub，其他开发者可 fork + 绑定自己的 CloudBase 上线

### 小红书投流文案
「再也不用在备忘录里写攻略了，这个小程序自动生成超美的旅行计划页✨」

---

## 三、目录结构

```
trippo-miniapp/
├── app.js                          # 入口：wx.cloud.init() + 三套主题色 + 主题持久化
├── app.json                        # 12 页面路由 + TabBar(首页/模板库/我的)
├── app.wxss                        # 全局 CSS 变量（--gold/--emerald/--bg）+ 工具类
├── project.config.json             # 小程序项目配置（AppID 待填）
├── sitemap.json
├── .gitignore
├── README.md
├── HANDOFF.md                      # 本文件
│
├── utils/
│   ├── cloudbase.js                # wx.cloud 初始化封装（ENV 常量）
│   ├── api.js                      # 数据 CRUD (trips + templates)
│   ├── format.js                   # 日期/金额/倒计时格式化工具
│   └── weather.js                  # Open-Meteo API 封装（云函数代理 + 直连回退）
│
├── cloudfunctions/                 # 云函数
│   ├── checkUsage/                 # ★ AI 次数统计（每次 DB 读写 < 3s）
│   ├── proxyWeather/               # Open-Meteo 天气 API 代理
│   ├── getPublicTrip/              # 绕过 _openid 读取公开旅行
│   ├── copyTemplate/               # 从模板复制创建旅行
│   ├── getTemplates/               # 模板列表查询
│   └── parseTravelPost/            # [已废弃] 原 AI 解析（个人版超时 3s 限制）
│
├── components/                     # 自定义组件（6 个）
│   ├── trip-card/                  # ★ 首页旅行预览卡片
│   ├── flight-card/                # ★ 登机牌风格航班卡
│   ├── countdown/                  # ★ SVG 环形倒计时
│   ├── weather-panel/              # ★ 天气模块
│   ├── day-card/                   # ★ 每日行程折叠卡片
│   └── activity-row/               # ★ 行程活动行（day-card 子组件）
│
├── pages/
│   ├── index/index.*               # ✓ 首页：列表+空状态+智能导入入口
│   ├── import/index.*              # ✓ 智能导入：剪贴板识别 + DeepSeek AI（Phase 7）
│   ├── trip/
│   │   ├── detail/index.*          # ✓ 详情页：Hero/航班/天气/行程/餐厅/贴士/常用语/伴手礼
│   │   ├── edit/index.*            # ✓ 编辑页：分段表单（4段可折叠）
│   │   ├── budget/index.*          # ✓ 记账本：多币种+人均分摊+预算对比（Phase 4）
│   │   ├── checklist/index.*       # ✓ 出发清单：分类勾选+进度条（Phase 4）
│   │   └── restaurants/index.*     # ✓ 餐厅编辑：标签选择器（Phase 4）
│   ├── map/map/index.*             # ✓ 全屏地图：<map>+分类筛选+popup（Phase 4）
│   ├── templates/
│   │   ├── list/index.*            # ✓ 模板库列表
│   │   └── preview/index.*         # ✓ 模板预览+一键创建
│   └── user/settings/index.*       # ✓ 设置：统计/主题/缓存/环境ID（Phase 6）
│
├── data/
│   └── default-templates.json     # 内置模板兜底（1 个东京模板）
│
└── images/
    ├── cover-default.jpg
    ├── tab-*.png                   # 6 个 TabBar 图标（占位色块，待替换）
    └── markers/                    # 4 个地图标注分类图标（占位色块）
```

✓ = 已实现

---

## 四、页面路由 & 导航流程

### app.json 注册表（12 个页面）

```
pages/index/index                    — 首页 (TabBar)
pages/import/index                   — 智能导入（AI 解析）
pages/trip/detail/index              — 旅行详情页
pages/trip/edit/index                — 编辑旅行
pages/trip/budget/index              — 记账本
pages/trip/checklist/index           — 出发清单
pages/trip/restaurants/index         — 餐厅编辑
pages/map/map/index                  — 全屏地图
pages/templates/list/index           — 模板库 (TabBar)
pages/templates/preview/index        — 模板预览
pages/user/settings/index            — 我的 (TabBar)
```

### 用户核心路径

```
[首页] ─「新建旅行」────→ [编辑页] ─「保存」─→ [详情页]
[首页] ─「🔮 智能导入」─→ [剪贴板识别→AI解析→预览→保存]
[首页] ─ 点击卡片 ─────→ [详情页] ─「编辑」─→ [编辑页]
[详情页] ─ 快捷入口 ───→ [记账本/清单/餐厅/地图]
[模板库] ─ 点击模板 ───→ [预览页] ─「使用」─→ [详情页]
```

### 分享路径

```
微信好友点击分享卡片
  → [详情页?tripId=xxx&fromShare=1]
  → 云函数 getPublicTrip 绕过 _openid
  → 只读模式（无编辑按钮）
  → 底部「✨ 我也要创建」引导到模板库
```

### 智能导入路径（Phase 7）

```
用户在小红书/公众号看到攻略
  → 复制链接
  → 打开 Trippo → 首页「🔮 智能导入」
  → 自动检测剪贴板链接，弹出「📋 检测到攻略链接」
  → 点「⚡ 一键导入解析」
  → checkUsage 云函数检查次数 + 抓取 URL 内容
  → 前端直连 DeepSeek API 解析
  → 预览行程/餐厅/贴士 → 确认保存
```

---

## 五、数据库设计

### trips 集合

权限：仅创建者可读写（CloudBase `_openid` 自动隔离）

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | String | 自动添加 |
| `tripId` | String | 前端 UUID v4 |
| `title` | String | 旅行标题 |
| `coverImage` | String | Hero 封面图 URL |
| `isPublic` | Boolean | 是否可被分享查看 |
| `theme` | String | gold-emerald / ocean-blue / sakura-pink |
| `meta` | Object | { startDate, endDate, travelers, destination, language, timezone, defaultLat, defaultLng } |
| `flights` | Object | { enabled, outbound, inbound } |
| `weather` | Object | { enabled, lat, lng } |
| `hotel` | Object | { name, address, lat, lng, tags, roomType, checkIn, checkOut } |
| `map` | Object | { markers, categories } |
| `itinerary` | Array | [{ day, date, theme, color, activities }] |
| `restaurants` | Array | [{ name, emoji, address, price, tags, description, recommend }] |
| `souvenirs` | Array | [{ name, emoji, price, where, description }] |
| `budget` | Object | { totalBudget, currencies, exchangeRates } |
| `expenses` | Array | [{ desc, amount, currency, splitType, people, createdAt }] |
| `checklist` | Array | [{ id, text, category, done, description }] |
| `tips` | Array | [{ title, body, color }] |
| `phrases` | Array | [{ category, localLanguage, pronunciation, translation }] |
| `createdAt` | Number | 时间戳 |
| `updatedAt` | Number | 时间戳 |

### templates 集合

权限：所有人可读，仅管理员可写

| 字段 | 类型 | 说明 |
|------|------|------|
| `templateId` | String | 模板 ID |
| `title` | String | 如"东京3日经典游" |
| `coverImage` | String | 封面图 |
| `category` | String | 城市/海岛/自驾/美食/蜜月 |
| `meta` | Object | { destination, recommendedDays, language, timezone, defaultLat, defaultLng } |
| `itinerary` | Array | 预填行程框架 |
| `restaurants` | Array | 推荐餐厅 |
| `tips` | Array | 目的地贴士 |
| `phrases` | Array | 常用语 |
| `checklist` | Array | 预设清单 |
| `useCount` | Number | 被使用次数 |
| `isOfficial` | Boolean | 是否官方模板 |

### aiUsage 集合（Phase 7）

权限：仅创建者可读写

| 字段 | 类型 | 说明 |
|------|------|------|
| `usageId` | String | `${openid}_${YYYY-MM-DD}` 唯一标识 |
| `openid` | String | 用户标识 |
| `date` | String | 日期 YYYY-MM-DD |
| `count` | Number | 当日使用次数 |
| `createdAt` | Number | 时间戳 |
| `updatedAt` | Number | 时间戳 |

---

## 六、设计系统（Ins风 · 小红书审美）

### 设计原则
1. **暖色底 + 毛玻璃** — 所有页面使用暖色渐变背景，卡片用半透白+backdrop-blur
2. **留白优先** — 内容呼吸，卡片间距 ≥ 24rpx，页边距 40rpx
3. **圆角统一 20-24rpx** — 按钮/卡片/输入框全部大圆角
4. **阴影分层** — `0 1px 2px rgba(0,0,0,0.02)` + `0 4px 16px rgba(0,0,0,0.03)` 双层柔阴影
5. **克制用色** — 主色低饱和度，辅助文字用 opacity 而非灰色
6. **少用装饰 emoji** — 只用功能性 emoji（区分区块/模式），不用纯装饰
7. **按钮小巧精致** — padding 20-24rpx，font-weight 500-600，不做笨重大按钮

### 全局 CSS 变量（app.wxss）

```css
--gold: #C4A265;                 /* 暖金色（降饱和） */
--gold-light: rgba(196,162,101,0.12);
--emerald: #5C8F7A;              /* 鼠尾草绿（降饱和） */
--emerald-light: rgba(92,143,122,0.08);
--bg: #F8F4EC;                   /* 页面基底 */
--card: rgba(255,255,255,0.55);  /* 毛玻璃卡片 */
--text: #1E293B;
--muted: #64748B;
--radius: 24rpx;                 /* 大圆角 */
--radius-sm: 14rpx;
--font: -apple-system, "PingFang SC", sans-serif;
```

### 页面背景渐变（Ins 风暖调）
所有页面使用统一背景渐变：
```css
background: linear-gradient(175deg, #F5F1E8 0%, #FEFCF5 30%, #F8F4EC 100%);
```

### 毛玻璃卡片规范
```css
background: rgba(255, 255, 255, 0.35);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1rpx solid rgba(255, 255, 255, 0.5);
border-radius: 24rpx;
```

### 底部固定栏规范
```css
background: rgba(255, 255, 255, 0.5);
backdrop-filter: blur(24px);
border-top: 1rpx solid rgba(0, 0, 0, 0.03);
```

### 三套主题色

| 主题名 | gold | emerald | bg |
|--------|------|---------|-----|
| gold-emerald (默认) | #C4A265 | #5C8F7A | #F8F4EC |
| ocean-blue | #3B82F6 | #1E40AF | #F0F7FF |
| sakura-pink | #EC4899 | #BE185D | #FFF5F7 |

主题持久化：`app.js` 启动时读取 `wx.getStorageSync('trippo_theme')`，设置页切换时写入。
使用方式：`<view class="page-detail {{trip.theme ? 'theme-' + trip.theme : ''}}">`

---

## 七、云端资源

### CloudBase 环境
- **环境 ID：** `cloud1-d9gr38v2je3c6e3c7`
- 用户通过微信登录自动鉴权，数据通过 `_openid` 隔离
- 个人版免费额度

### 云函数清单

| 云函数 | 触发方式 | 耗时 | 功能 |
|--------|---------|------|------|
| `checkUsage` | 智能导入时调用 | < 3s | 检查今日次数 + 自增 + 尽力抓取 URL 内容 |
| `proxyWeather` | weather-panel 组件 | < 3s | 代理 Open-Meteo 天气 API |
| `getPublicTrip` | 分享查看时调用 | < 1s | 绕过 _openid 读取公开旅行 |
| `copyTemplate` | 使用模板时调用 | < 1s | 复制模板数据到用户 trips |
| `getTemplates` | 模板库加载时调用 | < 1s | 模板列表查询 |
| `parseTravelPost` | **[已废弃]** | — | 原 AI 解析，个人版云函数超时 3s 无法使用 |

### 微信后台域名白名单

「开发管理 → 服务器域名」需添加：

| 类型 | 域名 | 用途 |
|------|------|------|
| request 合法域名 | `https://api.deepseek.com` | AI 解析（前端直连） |
| request 合法域名 | `https://api.open-meteo.com` | 天气数据（可选，也可走云函数） |

---

## 八、开发进度总览

### Phase 1-3：已完成
- 项目骨架 + CloudBase 初始化
- 首页列表 + trip-card 组件
- 详情页 + flight-card / countdown / weather-panel / day-card / activity-row 组件
- 编辑页（分段表单 4 段可折叠）
- 模板库列表 + 模板预览 + 一键创建
- 3 个云函数：getPublicTrip / copyTemplate / getTemplates

### Phase 4：已完成（地图/记账/清单/餐厅）

| 功能 | 文件 | 说明 |
|------|------|------|
| 地图页 | `pages/map/map/` | 微信原生 `<map>` + 分类筛选 cover-view + 底部 popup + 导航 |
| 记账本 | `pages/trip/budget/` | 多币种(6种) + 人均分摊 + 预算对比进度条 |
| 出发清单 | `pages/trip/checklist/` | 按分类分组 + 勾选动画 + 进度条 + 云端持久化 |
| 餐厅编辑 | `pages/trip/restaurants/` | 添加/编辑/删除 + 标签选择器（米其林/Bib/本地）|

### Phase 5：已完成（分享 & 社交）

| 功能 | 实现位置 | 说明 |
|------|---------|------|
| 分享卡片 | `detail/index.js:onShareAppMessage` | 动态标题「标题 · 目的地🏝️」+ 封面图 |
| 只读模式 | `detail/index.*` → `isOwner` flag | 非主人：无编辑/分享/公开按钮 |
| 引导创建 | `detail/index.wxml` 底部栏 | 「✨ 我也要创建」→ 跳转模板库 Tab |
| 公开切换 | `detail/index.js:onTogglePublic` | 实时切换 isPublic + 按钮文字同步 |

### Phase 6：已完成（主题/设置）+ 待完成（真机/审核）

**已完成：**
- ✅ 主题持久化 — `app.js` 启动读取 + 设置页切换即时生效
- ✅ 设置页 — 旅行统计/三套主题切换/清除缓存/复制环境ID/关于
- ✅ 所有页面加载态/空状态/错误态已覆盖
- ✅ 代码去越南化 — 坐标默认北京/示例文字东京/模板东京

**待完成（需微信开发者工具或真机）：**
- ❌ 真机测试（iOS + Android，特别是 `<map>` 原生组件的 cover-view 层级）
- ❌ 微信审核准备（AppID 配置、隐私协议、类目选择）
- ❌ TabBar 图标替换（当前为 175 字节占位色块，需 81×81 PNG）

### Phase 7：已完成（智能导入 — AI 解析攻略）

**核心架构：** 个人版 CloudBase 云函数硬限制 3 秒超时，AI 调用需要 10-30 秒 → **DeepSeek API 改由前端 `wx.request` 直连**。

| 功能 | 实现位置 | 说明 |
|------|---------|------|
| 剪贴板识别 | `pages/import/index.js:checkClipboard` | 打开页面自动检测，识别小红书/公众号/知乎等域名 |
| 次数控制 | `cloudfunctions/checkUsage/` | 轻量 DB 操作 < 3s，每人每天 10 次 |
| URL 抓取 | `cloudfunctions/checkUsage/` | 尽力抓取（每 URL 1.5s 超时），抓取失败不阻塞 |
| AI 解析 | `pages/import/index.js:callDeepSeek` | 前端直连 `api.deepseek.com`，60s 超时 |
| 预览保存 | `pages/import/index.*` | 展开行程/餐厅/贴士预览 + 一键保存 |

**使用流程：**
```
用户复制小红书链接 → 打开 Trippo → 首页「🔮 智能导入」
  → 自动弹出「📋 检测到攻略链接」→ ⚡ 一键导入解析
  → checkUsage 检查次数 + 抓取 URL → DeepSeek 解析
  → 预览行程/餐厅/贴士 → 保存
```

**DeepSeek API Key：** `pages/import/index.js` 第 8 行硬编码，调用 `deepseek-chat` 模型。

---

## 九、关键技术决策 & 注意事项

### WXML/WXSS 规范
1. **不能用 innerHTML**：动态内容通过 `wx:if`/`wx:for` + `{{}}` 数据绑定
2. **长度单位统一用 rpx**（750rpx = 屏幕宽度）
3. **`<map>` 是原生组件**，层级最高，覆盖层必须用 `<cover-view>`
4. **`backdrop-filter` 部分安卓不支持**：顶部栏用 `rgba()` 半透明替代
5. **CSS 变量完全支持**：在 app.wxss 中定义全局主题色
6. **横向滚动**：用 `<scroll-view scroll-x>`，不要用 CSS overflow-x

### 数据 & 性能
7. **setData 单次不超过 256KB**
8. **首页列表用 wx:for + wx:key="tripId"**
9. **图片用 `<image lazy-load>`**
10. **_openid 自动隔离**：小程序端 CloudBase SDK 自动附加
11. **分享绕过鉴权**：云函数 getPublicTrip 用 server SDK admin 权限

### 天气 & 网络
12. **天气 API 域名白名单**：直连 `api.open-meteo.com` 需在微信后台配置
13. **推荐走云函数代理**：proxyWeather 已就绪，避免审核问题
14. **天气时区用 `auto`**：不再硬编码 Asia/Bangkok

### AI 导入架构（重要）
15. **个人版云函数 3 秒超时限制**：DeepSeek 调用必须在前端完成
16. **API Key 在前端代码中**：`pages/import/index.js` 第 8 行
17. **次数统计仍在云函数**：轻量 DB 操作 < 3 秒，不受超时影响
18. **URL 抓取尽力而为**：云函数中每 URL 1.5 秒超时，抓不到不阻塞，直接传 URL 给 AI
19. **域名白名单必须配**：`api.deepseek.com` 加到微信后台 request 合法域名

### 编辑页
20. **深合并加载**：编辑页加载已有数据时使用 `deepMerge(emptyForm, trip)` 确保嵌套字段完整

---

## 十、部署清单

### 给新环境部署时需要的步骤

1. **替换环境 ID**（3 处）：
   - `app.js` 第 16 行
   - `utils/cloudbase.js` 第 6 行
   - 设置页中引用的 `ENV` 常量自动同步

2. **替换 DeepSeek API Key**（1 处）：
   - `pages/import/index.js` 第 8 行 `DEEPSEEK_KEY`

3. **创建数据库集合**（3 个）：
   - `trips` — 仅创建者可读写
   - `templates` — 所有人可读，仅管理员可写
   - `aiUsage` — 仅创建者可读写

4. **部署云函数**（5 个有效 + 1 个废弃）：
   - 右键 `cloudfunctions/` → 上传并部署：所有文件

5. **配置微信后台域名白名单**：
   - `https://api.deepseek.com`
   - `https://api.open-meteo.com`

6. **填入 AppID**：
   - `project.config.json` 中替换占位值

---

## 十一、给下一个 agent 的快速上手

### 环境准备
```bash
cd /Users/hankzhang/Desktop/trippo-miniapp
# 用微信开发者工具打开此目录
```

### 关键文件阅读顺序
1. `app.js` — CloudBase 初始化 + 主题定义 + 主题持久化
2. `app.json` — 页面路由 + TabBar
3. `app.wxss` — CSS 变量体系
4. `utils/api.js` — 数据层（CRUD 操作）
5. `utils/format.js` — 格式化工具
6. `pages/index/index.js` — 首页逻辑
7. `pages/import/index.js` — **智能导入（核心新功能）**
8. `pages/trip/detail/index.*` — 详情页（最复杂的页面）
9. `pages/map/map/index.*` — 地图页
10. `pages/trip/edit/index.*` — 编辑页
11. `cloudfunctions/checkUsage/index.js` — 次数统计 + URL 抓取

### 在微信开发者工具中实时预览
1. 打开项目 → 工具自动编译
2. 修改代码保存 → 自动热重载
3. 如果没自动刷新：点击「编译」按钮 或 `Cmd+B`
4. 模拟器中点击各页面查看效果
5. 点击「预览」→ 手机上扫码真机测试

### 添加新模板
编辑 `data/default-templates.json`，或在 CloudBase 控制台直接向 `templates` 集合添加文档。

### 部署云函数
微信开发者工具中右键各云函数文件夹 →「上传并部署：云端安装依赖」
