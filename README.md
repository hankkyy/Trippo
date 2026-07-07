# ✈️ Trippo — 旅行计划展示 & 分享小程序

> 再也不用在备忘录里写攻略了，这个小程序自动生成超美的旅行计划页 ✨

Trippo 是一个面向普通游客的微信小程序，帮助你：
- 📋 从模板库快速创建精美旅行计划
- ✏️ 在小程序内填写航班、酒店、行程、餐厅等信息
- 🎨 得到一个媲美专业设计稿的旅行计划展示页
- 📤 一键分享给微信好友（对方无需登录即可查看）

## 功能列表

- 🏠 **我的旅行列表** — 横向卡片滚动，倒计时提醒
- 🛫 **登机牌航班卡** — 渐变配色 + 虚线路线 + 穿孔线设计
- ⏳ **SVG 环形倒计时** — 天/时/分/秒四色独立圆环
- 🌤️ **实时天气** — Open-Meteo 集成，5日预报 + 逐小时详情
- 📅 **每日行程时间轴** — 折叠卡片 + 当前活动高亮
- 🗺️ **旅行地图** — 微信原生 map + 分类 marker + 底部 popup
- 🍜 **餐厅清单** — 标签系统（Michelin/Bib Gourmand/本地推荐）
- 💰 **多币种记账本** — 支持多币种 + 人均分摊 + 预算对比
- ✅ **出发清单** — 分类勾选 + 进度条 + 多端同步
- 💡 **旅行贴士** — 9色卡片系统
- 🗣️ **常用语速成** — 谐音发音对照表
- 🛍️ **伴手礼指南** — 价格/购买地点
- 🎨 **三套主题色** — 金绿 / 海蓝 / 樱花粉

## 技术栈

- **前端：** 微信小程序原生框架（WXML + WXSS + JS）
- **后端：** 腾讯云 CloudBase（云开发）
  - 云数据库（NoSQL）
  - 云函数（Node.js）
  - 云存储（图片等静态资源）
- **天气：** Open-Meteo 免费天气 API
- **地图：** 微信原生 `<map>` 组件

## 如何部署你自己的版本

### 前提条件

1. 注册微信小程序账号（[mp.weixin.qq.com](https://mp.weixin.qq.com)）
2. 注册腾讯云 CloudBase（[cloud.tencent.com](https://cloud.tencent.com)）

### 三步部署

#### 1. 克隆项目 & 安装依赖

```bash
git clone https://github.com/你的用户名/trippo-miniapp.git
cd trippo-miniapp
```

#### 2. 修改 CloudBase 环境配置

编辑 `app.js`，将 `env` 改为你的 CloudBase 环境 ID：

```js
wx.cloud.init({
  env: '你的环境ID',  // 替换这里
  traceUser: true
});
```

编辑 `project.config.json`，填入你的小程序 AppID：

```json
{
  "appid": "wx你的AppID"
}
```

#### 3. 上传部署

1. 用微信开发者工具打开项目
2. 在「云开发」面板中创建以下数据库集合：
   - `trips` — 权限：仅创建者可读写
   - `templates` — 权限：所有人可读，仅管理员可写
3. 右键 `cloudfunctions/` 目录 → 上传并部署所有云函数
4. 在微信后台「开发管理 → 服务器域名」中，添加 `request` 合法域名：
   - `https://api.open-meteo.com`
5. 上传代码 → 提交审核 → 上线 🎉

## 数据库集合结构

### trips 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | String | CloudBase 自动添加，用户隔离 |
| `tripId` | String | 唯一旅行 ID (UUID) |
| `title` | String | 旅行标题 |
| `coverImage` | String | Hero 区域背景图 URL |
| `meta` | Object | `{ startDate, endDate, travelers, destination }` |
| `flights` | Object | `{ outbound: {...}, inbound: {...} }` |
| `itinerary` | Array | 每日行程 |
| `restaurants` | Array | 餐厅列表 |
| `expenses` | Array | 花费记录 |
| `checklist` | Array | 出发清单 |
| `isPublic` | Boolean | 是否可被分享查看 |
| `theme` | String | 主题色方案 |

### templates 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| `templateId` | String | 模板 ID |
| `title` | String | 模板名称 |
| `category` | String | 城市/海岛/自驾/美食/蜜月 |
| `itinerary` | Array | 预填行程框架 |
| `useCount` | Number | 被使用次数 |
| `isOfficial` | Boolean | 是否官方模板 |

## 目录结构

```
trippo-miniapp/
├── app.js                    # 入口：wx.cloud.init()
├── app.json                  # 页面路由 + tabBar
├── app.wxss                  # 全局样式 + CSS 变量
├── project.config.json       # 小程序项目配置
│
├── pages/
│   ├── index/                # 首页：我的旅行列表
│   ├── trip/
│   │   ├── detail/           # 旅行详情页（核心页面）
│   │   ├── edit/             # 编辑旅行
│   │   ├── budget/           # 记账本
│   │   ├── checklist/        # 出发清单
│   │   └── restaurants/      # 餐厅编辑
│   ├── map/                  # 全屏地图
│   ├── templates/
│   │   ├── list/             # 模板库列表
│   │   └── preview/          # 模板预览
│   └── user/settings/        # 用户设置
│
├── components/
│   ├── trip-card/            # 首页旅行预览卡片
│   ├── flight-card/          # 登机牌卡片
│   ├── countdown/            # SVG 环形倒计时
│   ├── weather-panel/        # 天气模块
│   ├── day-card/             # 每日行程折叠卡片
│   ├── resto-item/           # 餐厅条目
│   ├── activity-row/         # 行程活动行
│   ├── expense-item/         # 花费条目
│   ├── checklist-group/      # 清单分组
│   └── tip-card/             # 贴士卡片
│
├── cloudfunctions/
│   ├── getPublicTrip/        # 读取公开旅行（绕过 _openid）
│   ├── copyTemplate/         # 从模板复制创建旅行
│   └── getTemplates/         # 获取模板列表
│
├── utils/
│   ├── cloudbase.js          # wx.cloud 初始化
│   ├── api.js                # 数据 CRUD 封装
│   ├── weather.js            # Open-Meteo API
│   └── format.js             # 日期/金额格式化
│
├── data/
│   └── default-templates.json # 内置模板兜底数据
│
└── images/
    ├── cover-default.jpg     # 默认封面图
    └── markers/              # 地图标注图标
```

## 贡献指南

欢迎 PR！请确保：

1. 遵循微信小程序开发规范（rpx 单位、数据驱动、无 innerHTML）
2. 组件放在 `components/` 目录，有完整的 `.wxml/.wxss/.js/.json` 四件套
3. 全局样式变量定义在 `app.wxss`
4. 云函数改动需要同步更新 `package.json`（如有新增依赖）

## License

MIT
