// ═══════════════════════════════════════════════
// 从帖子导入页 — 剪贴板识别 + 内容整理
//   打开即检测剪贴板链接 → 导入整理
// ═══════════════════════════════════════════════

const api = require('../../utils/api');

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const FETCH_PROXY = 'https://hankzhang.cloud/api/fetch-url';

// API Key 从 CloudBase config 集合动态读取，不在代码中硬编码
// CloudBase 控制台 → 数据库 → config 集合 → 创建文档 { _id: 'deepseek', key: 'sk-xxx' }
let cachedKey = null;
async function getDeepSeekKey() {
  if (cachedKey) return cachedKey;
  try {
    const cache = wx.getStorageSync('trippo_ds_key');
    if (cache) { cachedKey = cache; return cachedKey; }
  } catch (_) {}
  try {
    const db = wx.cloud.database();
    const res = await db.collection('config').doc('deepseek').get();
    if (res.data && res.data.key) {
      cachedKey = res.data.key;
      wx.setStorageSync('trippo_ds_key', cachedKey);
      return cachedKey;
    }
  } catch (_) {}
  throw new Error('API Key 未配置，请在 CloudBase 控制台 config 集合中添加');
}

function uuid() {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) s += '-';
  }
  return s;
}

const SYSTEM_PROMPT = `你是资深旅行编辑，帮用户把零散的游记攻略整理成一条实用旅行计划。

输出 JSON，字段说明：

{
  "title": "标题（抓目的地亮点，不要AI腔。好例子：「巴黎3日·左岸咖啡与蒙马特日落」坏例子：「巴黎经典三日游攻略」）",
  "destination": "目的地",
  "meta": { "recommendedDays": 数字, "language": "语言码ja/ko/th/vi/en等", "defaultLat": 纬度, "defaultLng": 经度 },
  "itinerary": [
    {
      "day": 1,
      "theme": "这一天的一句话概括（像朋友圈文案，如「暴走曼哈顿，从早到晚把纽约踩在脚下」）",
      "activities": [
        { "time": "09:00", "title": "活动", "subtitle": "一句话亮点", "detail": "实用信息：价格、交通、排队时间、省钱技巧。写具体，别写废话。" }
      ]
    }
  ],
  "restaurants": [
    {
      "name": "店名",
      "emoji": "贴合食物的emoji",
      "address": "地址",
      "price": "人均（带币种）",
      "tags": [{"label": "必吃", "type": "must"}],
      "description": "一句话说清为什么值得去（口味/氛围/历史）",
      "recommend": "去了必点的一道菜"
    }
  ],
  "tips": [
    { "title": "带emoji标题", "color": "色号", "body": ["具体建议1", "具体建议2", "建议3"] }
  ],
  "phrases": [
    { "category": "场景", "localLanguage": "当地语", "pronunciation": "谐音", "translation": "中文" }
  ],
  "checklist": [{"text": "事项", "category": "证件/出行/数码/衣物/药品", "done": false}],
  "souvenirs": [{"name": "物品", "emoji": "🎁", "price": "价格", "where": "哪里买最对", "description": "为什么值"}]
}

写作要求：
- 语言像朋友给你发微信推荐，口语化，有态度，别端着
- detail 必须具体（"门票3000日元，提前网上买省500"而非"需购票"）
- tags.type: must=必吃 mich=米其林 bib=Bib Gourmand local=本地推荐
- tips.color: #3B82F6天气 #F59E0B交通 #10B981支付 #DC2626安全 #8B5CF6文化 #EC4899购物
- 不要废话（"祝您旅途愉快""希望以上信息对您有帮助"等AI高频句一律删除）
- 缺失的字段用 [] 或 null
- 纯 JSON 输出，不要markdown包裹`;

Page({
  data: {
    inputMode: 'text',
    urls: '',
    rawText: '',
    status: 'input',
    statusMsg: '',
    errorMsg: '',
    tripData: null,
    remaining: null,
    dailyLimit: 10,
    showFullPreview: false,
    showTips: false,
    showPhrases: false,
    showSouvenirs: false,
    accumulatedText: '', // 多次添加时累积原始内容
    clipboardUrl: '' // 剪贴板检测到的链接
  },

  onLoad() {
    this.checkClipboard();
  },

  onShow() {
    // 每次回到页面都重新检测剪贴板
    if (this.data.status === 'input') {
      this.checkClipboard();
    }
  },

  // ═══ 自动检测剪贴板链接 ═══
  checkClipboard() {
    wx.getClipboardData({
      success: (res) => {
        const data = res.data || '';
        // 检测是否包含链接
        const urlMatch = data.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const url = urlMatch[0];
          // 是攻略类网站
          if (this.isTravelUrl(url)) {
            this.setData({
              clipboardUrl: url,
              urls: url,
              inputMode: 'urls'
            });
          }
        }
      },
      fail: () => {} // 剪贴板为空，忽略
    });
  },

  isTravelUrl(url) {
    const travelDomains = [
      'xiaohongshu.com', 'xhslink.com',
      'douyin.com', 'weixin.qq.com', 'mp.weixin.qq.com',
      'zhihu.com', 'ctrip.com', 'mafengwo.cn',
      'qyer.com', 'dianping.com', 'meituan.com',
      'bilibili.com', 'weibo.com'
    ];
    return travelDomains.some(d => url.includes(d));
  },

  onSwitchMode(e) {
    this.setData({ inputMode: e.currentTarget.dataset.mode });
  },

  onUrlsInput(e) {
    this.setData({ urls: e.detail.value });
  },

  onTextInput(e) {
    this.setData({ rawText: e.detail.value });
  },

  // ═══ 一键导入剪贴板 ═══
  onQuickImport() {
    this.setData({
      urls: this.data.clipboardUrl,
      inputMode: 'urls'
    });
    this.onStartParse();
  },

  onClearClipboard() {
    this.setData({ clipboardUrl: '', urls: '' });
  },

  // ═══ 开始解析 ═══
  async onStartParse() {
    const { urls, rawText, inputMode } = this.data;

    const urlList = urls.split(/[\n,;，；]+/).map(s => s.trim()).filter(s => s.length > 0);
    const text = rawText.trim();

    if (inputMode === 'urls' && urlList.length === 0) {
      wx.showToast({ title: '请输入至少一个链接', icon: 'none' });
      return;
    }
    if (inputMode === 'text' && !text) {
      wx.showToast({ title: '请粘贴攻略内容', icon: 'none' });
      return;
    }

    this.setData({ status: 'parsing', statusMsg: '检查中…' });

    try {
      // Step 1: 检查次数（纯 DB 读写，不超时）
      const checkRes = await wx.cloud.callFunction({ name: 'checkUsage' });
      if (checkRes.result && !checkRes.result.success) {
        throw new Error(checkRes.result.error);
      }

      const remaining = checkRes.result ? checkRes.result.remaining : null;
      const limit = checkRes.result ? checkRes.result.limit : this.data.dailyLimit;
      this.setData({ remaining, dailyLimit: limit });

      // Step 2: 获取内容
      let contentForAI = '';

      if (inputMode === 'urls') {
        this.setData({ statusMsg: '正在读取链接…' });
        const fetchResults = await this.fetchUrls(urlList);

        if (fetchResults.length === 0) {
          throw new Error('链接读取失败，可能是页面需要登录。试试文字模式：在小红书里全选复制攻略文字，粘贴到这里');
        }

        contentForAI = fetchResults.join('\n\n---\n\n');
        this.setData({ statusMsg: '正在整理内容…' });
      } else {
        this.setData({ statusMsg: '正在整理攻略…' });
        contentForAI = text;
      }

      // Step 3: 累积内容
      const prevText = this.data.accumulatedText;
      const allContent = prevText
        ? prevText + '\n\n===以下是追加的新攻略内容===\n\n' + contentForAI
        : contentForAI;

      this.setData({ accumulatedText: allContent });

      // Step 4: 调 DeepSeek（每次综合所有内容重新生成完整计划）
      const parsed = await this.callDeepSeek(allContent);
      const result = normalizeTripData(parsed);

      this.setData({ status: 'preview', tripData: result });

    } catch (err) {
      console.error('解析失败:', err);
      this.setData({ status: 'error', errorMsg: err.message || '整理失败，请重试' });
    }
  },

  // ═══ 通过 Vercel 代理抓取 URL 内容 ═══
  fetchUrls(urlList) {
    const that = this;
    const results = [];

    function fetchOne(url) {
      return new Promise((resolve) => {
        wx.request({
          url: FETCH_PROXY,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          timeout: 15000,
          data: { url: url },
          success(res) {
            if (res.statusCode === 200 && res.data && res.data.success) {
              that.setData({ statusMsg: '✅ 已抓取: ' + (res.data.sourceUrl || url).substring(0, 40) });
              resolve(res.data.text || '');
            } else {
              const errMsg = (res.data && res.data.error) || '抓取失败';
              console.warn('Vercel fetch error:', errMsg);
              that.setData({ statusMsg: '⚠️ ' + errMsg });
              resolve('');
            }
          },
          fail(err) {
            console.warn('Vercel request failed:', err);
            resolve('');
          }
      });
    });
    }

    return Promise.all(urlList.slice(0, 3).map(url => fetchOne(url)))
      .then(texts => texts.filter(t => t.length > 100));
  },

  async callDeepSeek(content) {
    const key = await getDeepSeekKey();
    return new Promise((resolve, reject) => {
      wx.request({
        url: DEEPSEEK_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        timeout: 60000,
        data: {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: '请从以下旅行攻略内容中提取结构化旅行信息：\n\n' + content }
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        },
        success(res) {
          if (res.statusCode === 200 && res.data && res.data.choices) {
            const text = res.data.choices[0].message.content;
            try {
              resolve(JSON.parse(text));
            } catch (e) {
              const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (match) {
                resolve(JSON.parse(match[1].trim()));
              } else {
                const objMatch = text.match(/\{[\s\S]*\}/);
                if (objMatch) resolve(JSON.parse(objMatch[0]));
                else reject(new Error('返回格式异常'));
              }
            }
          } else {
            reject(new Error('DeepSeek API: ' + JSON.stringify(res.data)));
          }
        },
        fail(err) {
          reject(new Error('网络请求失败: ' + (err.errMsg || '未知错误')));
        }
      });
    });
  },

  async onSave() {
    const { tripData } = this.data;
    this.setData({ status: 'saving', statusMsg: '💾 保存中…' });
    try {
      const data = { ...tripData, tripId: uuid(), theme: 'gold-emerald', isPublic: false };
      await api.createTrip(data);
      wx.showToast({ title: '创建成功！', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/trip/detail/index?tripId=' + data.tripId });
      }, 1000);
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'error' });
      this.setData({ status: 'preview' });
    }
  },

  onRetry() {
    this.setData({ status: 'input', errorMsg: '', tripData: null, accumulatedText: '' });
  },

  onTogglePreview() {
    this.setData({ showFullPreview: !this.data.showFullPreview });
  },

  onToggleTips() { this.setData({ showTips: !this.data.showTips }); },
  onTogglePhrases() { this.setData({ showPhrases: !this.data.showPhrases }); },
  onToggleSouvenirs() { this.setData({ showSouvenirs: !this.data.showSouvenirs }); },

  // 继续添加：保留累积内容，清空输入框回到输入模式
  onContinueAdd() {
    this.setData({
      status: 'input', urls: '', rawText: '',
      showFullPreview: false, showTips: false, showPhrases: false, showSouvenirs: false
    });
  },

  // 重来：清空一切
  onBackToInput() {
    this.setData({
      status: 'input', tripData: null, accumulatedText: '',
      urls: '', rawText: '',
      showFullPreview: false, showTips: false, showPhrases: false, showSouvenirs: false
    });
  },

  getStats() {
    const d = this.data.tripData;
    if (!d) return '';
    const parts = [];
    if (d.itinerary) parts.push(d.itinerary.length + '天行程');
    if (d.restaurants) parts.push(d.restaurants.length + '家餐厅');
    if (d.tips) parts.push(d.tips.length + '条贴士');
    if (d.phrases) parts.push(d.phrases.length + '句常用语');
    return parts.join(' · ') || '已提取旅行信息';
  }
});

function normalizeTripData(raw) {
  return {
    title: raw.title || '未命名旅行',
    destination: raw.destination || (raw.meta && raw.meta.destination) || '',
    meta: {
      destination: raw.destination || (raw.meta && raw.meta.destination) || '',
      recommendedDays: (raw.meta && raw.meta.recommendedDays) || (raw.itinerary ? raw.itinerary.length : 3),
      language: (raw.meta && raw.meta.language) || 'zh-CN',
      timezone: (raw.meta && raw.meta.timezone) || 'auto',
      defaultLat: (raw.meta && raw.meta.defaultLat) || 39.9042,
      defaultLng: (raw.meta && raw.meta.defaultLng) || 116.4074,
      travelers: '', startDate: '', endDate: ''
    },
    itinerary: (raw.itinerary || []).map((day, i) => ({
      day: day.day || i + 1, date: day.date || '',
      theme: day.theme || '第' + (i + 1) + '天', color: day.color || 'db' + ((i % 3) + 1),
      activities: (day.activities || []).map(a => ({
        time: a.time || '', title: a.title || '', subtitle: a.subtitle || '', detail: a.detail || ''
      }))
    })),
    restaurants: (raw.restaurants || []).map(r => ({
      name: r.name || '', emoji: r.emoji || '🍽️', address: r.address || '', price: r.price || '',
      tags: (r.tags || []).map(t => ({ label: t.label || '', type: t.type || 'local' })),
      description: r.description || '', recommend: r.recommend || ''
    })),
    tips: (raw.tips || []).map(t => ({
      title: t.title || '', color: t.color || '#64748B',
      body: Array.isArray(t.body) ? t.body : (t.body ? [t.body] : [])
    })),
    phrases: (raw.phrases || []).map(p => ({
      category: p.category || '', localLanguage: p.localLanguage || '',
      pronunciation: p.pronunciation || '', translation: p.translation || ''
    })),
    checklist: (raw.checklist || []).map(c => ({
      id: 'ai-' + Math.random().toString(36).substring(2, 9),
      text: c.text || '', category: c.category || '其他', done: false
    })),
    souvenirs: (raw.souvenirs || []).map(s => ({
      name: s.name || '', emoji: s.emoji || '🎁', price: s.price || '',
      where: s.where || '', description: s.description || ''
    })),
    weather: { enabled: true }, flights: { enabled: false },
    budget: { totalBudget: 0 }, theme: 'gold-emerald', isPublic: false
  };
}

// ═══ 合并多个帖子内容 ═══
function mergeTrips(base, add) {
  // 去重辅助
  function dedupeByName(arr, key) {
    key = key || 'name';
    const seen = new Set(arr.map(x => x[key]));
    return (add[key] && !seen.has(add[key])) ? arr.concat([add]) : arr;
  }

  // 行程：追加新天（按最大 day 续号）
  const maxDay = base.itinerary.reduce((m, d) => Math.max(m, d.day || 0), 0);
  const newDays = (add.itinerary || []).map((d, i) => ({
    ...d,
    day: maxDay + i + 1,
    color: 'db' + ((maxDay + i) % 3 + 1)
  }));

  // 餐厅：按名称去重
  const restoNames = new Set(base.restaurants.map(r => r.name));
  const newRestos = (add.restaurants || []).filter(r => !restoNames.has(r.name));

  // 贴士：按标题去重
  const tipTitles = new Set(base.tips.map(t => t.title));
  const newTips = (add.tips || []).filter(t => !tipTitles.has(t.title));

  // 常用语：按翻译去重
  const phraseKeys = new Set(base.phrases.map(p => p.translation));
  const newPhrases = (add.phrases || []).filter(p => !phraseKeys.has(p.translation));

  // 伴手礼：按名去重
  const souvNames = new Set(base.souvenirs.map(s => s.name));
  const newSouvenirs = (add.souvenirs || []).filter(s => !souvNames.has(s.name));

  // 清单：按 text 去重
  const clTexts = new Set(base.checklist.map(c => c.text));
  const newChecklist = (add.checklist || []).filter(c => !clTexts.has(c.text));

  return {
    ...base,
    itinerary: base.itinerary.concat(newDays),
    restaurants: base.restaurants.concat(newRestos),
    tips: base.tips.concat(newTips),
    phrases: base.phrases.concat(newPhrases),
    souvenirs: base.souvenirs.concat(newSouvenirs),
    checklist: base.checklist.concat(newChecklist)
  };
}
