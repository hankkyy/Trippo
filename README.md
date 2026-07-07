# ✈️ Trippo — Travel Plan, Beautifully

> Stop writing travel plans in your notes app. Trippo generates stunning, share-worthy travel guides in minutes.

**English** | [中文](#中文)

Trippo is a WeChat Mini Program that helps you:
- Pick a template or paste a travel guide link from Xiaohongshu/WeChat
- AI parses it into a structured travel plan — flights, hotels, itinerary, restaurants, budget, checklist
- Get a beautifully designed page that looks like a travel magazine
- Share it with friends (no login required for viewers)

---

## Features

- **AI Smart Import** — Paste a guide link, get a complete travel plan in seconds
- **Boarding Pass Flight Cards** — Gradient design with perforation line
- **SVG Countdown Rings** — Days/hours/minutes/seconds, four-color independent rings
- **Live Weather** — Open-Meteo integration, 5-day forecast + hourly details
- **Daily Itinerary Timeline** — Collapsible cards + current activity highlight
- **Travel Map** — Native WeChat `<map>` + categorized markers
- **Restaurant Guide** — Michelin / Bib Gourmand / Local recommendation tags
- **Multi-Currency Budget** — Per-person split + budget comparison
- **Packing Checklist** — Categorized checkboxes + progress bar
- **Travel Tips & Phrases** — Local language cheat sheet + souvenir guide
- **3 Theme Colors** — Sage Green / Ocean Blue / Sakura Pink

---

## Tech Stack

- **Frontend:** WeChat Mini Program (WXML + WXSS + JS)
- **Backend:** Tencent CloudBase (Cloud Development)
  - NoSQL Database
  - Cloud Functions (Node.js)
- **AI:** DeepSeek API
- **Weather:** Open-Meteo
- **Map:** WeChat Native `<map>`

---

## Quick Start

### Prerequisites

1. WeChat Mini Program account ([mp.weixin.qq.com](https://mp.weixin.qq.com))
2. Tencent CloudBase account ([cloud.tencent.com](https://cloud.tencent.com))
3. DeepSeek API key ([platform.deepseek.com](https://platform.deepseek.com))

### Setup

```bash
git clone https://github.com/hankkyy/Trippo.git
cd Trippo
```

1. **Configure CloudBase** — Edit `app.js` and `utils/cloudbase.js`, replace `cloud1-d9gr38v2je3c6e3c7` with your env ID
2. **Set AppID** — Edit `project.config.json`, replace with your Mini Program AppID
3. **Create database collections** in CloudBase console:
   - `trips` — read/write: creator only
   - `templates` — read: all, write: admin only
   - `aiUsage` — read/write: creator only
   - `config` — read: all; add document `{ _id: "deepseek", key: "sk-your-key" }`
4. **Set cloud function env vars** — `parseTravelPost` → add `DEEPSEEK_API_KEY`
5. **Deploy cloud functions** — Right-click `cloudfunctions/` → Upload & Deploy
6. **Whitelist domains** in WeChat backend:
   - `https://api.deepseek.com`
   - `https://api.open-meteo.com`
7. Open in WeChat Developer Tools → Compile → Preview

---

## Project Structure

```
trippo-miniapp/
├── app.js / app.json / app.wxss    # Entry & global styles
├── pages/
│   ├── index/                       # Home — trip list
│   ├── import/                      # AI smart import
│   ├── trip/
│   │   ├── detail/                  # Trip detail (core page)
│   │   ├── edit/                    # Trip editor
│   │   ├── budget/                  # Expense tracker
│   │   ├── checklist/               # Packing checklist
│   │   └── restaurants/             # Restaurant editor
│   ├── map/map/                     # Full-screen map
│   ├── templates/list+preview/      # Template library
│   └── user/settings/               # Settings
├── components/                      # Reusable UI components
├── cloudfunctions/                  # CloudBase functions
├── utils/                           # API / format / weather helpers
└── images/                          # Icons & markers
```

---

## Design

Warm, editorial, magazine-style. White backgrounds, sage green accents, generous whitespace, glass-morphism cards. Designed to look premium when shared on social feeds.

---

## License

MIT

---

## 中文

Trippo 是一个微信小程序，帮你：
- 从模板库选择或粘贴小红书/公众号攻略链接
- AI 智能解析成结构化旅行计划
- 生成杂志排版级别的精美展示页
- 一键分享给微信好友（无需登录即可查看）

### 功能
- **AI 智能导入** — 粘贴攻略链接，秒出完整旅行计划
- **登机牌航班卡** — 渐变配色 + 穿孔撕线设计
- **SVG 环形倒计时** — 天/时/分/秒四色圆环
- **实时天气** — 5日预报 + 逐小时详情
- **每日行程时间轴** — 折叠卡片 + 当前活动高亮
- **旅行地图** — 微信原生 map + 分类标记
- **餐厅指南** — 米其林 / Bib Gourmand / 本地推荐标签
- **多币种记账** — 人均分摊 + 预算对比
- **出发清单** — 分类勾选 + 进度条
- **旅行贴士 & 常用语** — 当地语言速成 + 伴手礼指南

### 技术栈
微信小程序原生 + 腾讯云 CloudBase + DeepSeek API + Open-Meteo

### 部署
同上 English 部分 Setup 步骤。

🤖 Built with [Claude Code](https://claude.com/claude-code)
