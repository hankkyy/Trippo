// ═══════════════════════════════════════════════
// parseTravelPost — AI 智能解析旅行攻略
//   输入：URL 列表 或 原始文本
//   输出：结构化旅行数据 (JSON)
//   使用 DeepSeek API 进行内容提取
// ═══════════════════════════════════════════════

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ⚠️ 部署前替换为你的 DeepSeek API Key
// 获取地址: https://platform.deepseek.com/api_keys
const DEEPSEEK_API_KEY = 'YOUR_DEEPSEEK_API_KEY';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 每人每天免费次数
const DAILY_LIMIT = 10;

// ═══ 主入口 ═══
exports.main = async (event) => {
  const { urls, rawText } = event;

  // 验证输入
  if ((!urls || urls.length === 0) && (!rawText || rawText.trim() === '')) {
    return { success: false, error: '请提供链接或攻略文字' };
  }

  try {
    // ═══ 频率限制：每人每天 {DAILY_LIMIT} 次 ═══
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, error: '请先登录' };
    }

    const db = cloud.database();
    const today = getTodayStr();
    const usageId = `${openid}_${today}`;

    // 查询今日使用次数
    const usageDoc = await db.collection('aiUsage')
      .where({ usageId })
      .limit(1)
      .get();

    let todayCount = 0;

    if (usageDoc.data && usageDoc.data.length > 0) {
      todayCount = usageDoc.data[0].count || 0;

      if (todayCount >= DAILY_LIMIT) {
        return {
          success: false,
          error: `今日免费次数已用完（${DAILY_LIMIT}/${DAILY_LIMIT}），明天再来吧 🌅`,
          remaining: 0,
          limit: DAILY_LIMIT
        };
      }
    }

    // Step 1: 收集内容
    let contents = [];

    if (rawText && rawText.trim()) {
      contents.push({ source: '用户粘贴', text: rawText.trim() });
    }

    if (urls && urls.length > 0) {
      const fetchedContents = await fetchUrls(urls);
      contents = contents.concat(fetchedContents);
    }

    if (contents.length === 0) {
      return { success: false, error: '未能获取任何内容，请检查链接或直接粘贴文字' };
    }

    // Step 2: 组装 prompt 发给 DeepSeek
    const combinedText = contents
      .map((c, i) => `【来源${i + 1}】${c.source}\n${c.text}`)
      .join('\n\n---\n\n');

    const tripData = await callDeepSeek(combinedText);

    // Step 3: 验证并补充默认值
    const result = normalizeTripData(tripData);

    // Step 4: 更新使用次数
    const newCount = todayCount + 1;
    if (usageDoc.data && usageDoc.data.length > 0) {
      await db.collection('aiUsage')
        .doc(usageDoc.data[0]._id)
        .update({ data: { count: newCount, updatedAt: Date.now() } });
    } else {
      await db.collection('aiUsage').add({
        data: {
          usageId,
          openid,
          date: today,
          count: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      });
    }

    return {
      success: true,
      data: result,
      sources: contents.map(c => c.source),
      remaining: DAILY_LIMIT - newCount,
      limit: DAILY_LIMIT
    };

  } catch (err) {
    console.error('parseTravelPost error:', err);
    return {
      success: false,
      error: err.message || 'AI 解析失败，请重试'
    };
  }
};

// ═══ 获取今日日期字符串 YYYY-MM-DD ═══
function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ═══ 抓取 URL 内容 ═══
async function fetchUrls(urls) {
  const https = require('https');
  const http = require('http');
  const results = [];

  for (const url of urls) {
    try {
      const content = await fetchSingleUrl(url, https, http);
      if (content && content.length > 50) {
        // 提取域名作为来源标识
        const hostname = extractHostname(url);
        results.push({
          source: hostname || url,
          text: cleanHtml(content)
        });
      } else {
        results.push({
          source: url,
          text: '[内容较短或无法提取，建议手动粘贴]'
        });
      }
    } catch (err) {
      console.warn(`抓取 ${url} 失败:`, err.message);
      results.push({
        source: url,
        text: '[抓取失败: ' + err.message + '，请手动粘贴内容]'
      });
    }
  }

  return results;
}

function fetchSingleUrl(url, https, http) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000, headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TrippoBot/1.0)'
    }}, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        resolve(fetchSingleUrl(redirectUrl, https, http));
        return;
      }

      let data = '';
      res.on('data', chunk => {
        data += chunk;
        // 限制大小 200KB
        if (data.length > 200000) {
          res.destroy();
          resolve(data.substring(0, 200000));
        }
      });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

function extractHostname(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

function cleanHtml(html) {
  if (!html) return '';
  // 简单的 HTML 清理：去掉标签，保留文本
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text.substring(0, 30000);
}

// ═══ 调用 DeepSeek API ═══
async function callDeepSeek(content) {
  const https = require('https');

  const systemPrompt = `你是一个专业的旅行攻略解析助手。用户会给你一些游记/攻略/笔记内容，请你从中提取出一个完整的旅行计划。

请严格按以下 JSON 格式输出（不要输出任何其他内容，只输出 JSON）：

{
  "title": "旅行标题（简洁有吸引力，如「东京3日深度游」）",
  "destination": "目的地名称",
  "meta": {
    "recommendedDays": 数字,
    "language": "目的地语言代码，如 ja、th、en",
    "defaultLat": 数字(纬度),
    "defaultLng": 数字(经度)
  },
  "itinerary": [
    {
      "day": 1,
      "theme": "当天主题（如「老城区探索」）",
      "activities": [
        { "time": "09:00", "title": "活动名称", "subtitle": "简短描述", "detail": "实用信息（门票/交通/贴士）" }
      ]
    }
  ],
  "restaurants": [
    {
      "name": "餐厅名",
      "emoji": "🍜",
      "address": "地址",
      "price": "人均价格（如「~1000日元」）",
      "tags": [{ "label": "必吃", "type": "must" }],
      "description": "一句话描述",
      "recommend": "必点菜"
    }
  ],
  "tips": [
    { "title": "🌦️ 天气", "color": "#3B82F6", "body": ["贴士1", "贴士2"] }
  ],
  "phrases": [
    { "category": "问候", "localLanguage": "こんにちは", "pronunciation": "kon-ni-chi-wa", "translation": "你好" }
  ],
  "checklist": [
    { "text": "护照", "category": "证件" }
  ],
  "souvenirs": [
    { "name": "伴手礼名称", "emoji": "🎁", "price": "参考价格", "where": "购买地点", "description": "简短描述" }
  ]
}

规则：
1. 如果内容中缺失某些信息，相应字段留空数组 [] 或 null
2. itinerary 中 activities 的时间尽量从原文推断，按一天的时间顺序排列
3. restaurants 的 tags.type 可选值：must（必吃）、mich（米其林）、bib（Bib Gourmand）、local（本地推荐）
4. tips 的 color 从以下颜色中选：天气用 #3B82F6、交通用 #F59E0B、支付用 #10B981、安全用 #DC2626、其他用 #8B5CF6
5. tags 的 type 可选值：must、mich、bib、local
6. 不要编造信息，只提取原文中明确提到的内容
7. 坐标（lat/lng）如果不确定，使用目的地主要城区的近似坐标`;

  const userPrompt = `请从以下旅行攻略内容中提取结构化旅行信息：\n\n${content}`;

  const requestBody = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      DEEPSEEK_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 60000
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`DeepSeek API: ${response.error.message || '未知错误'}`));
              return;
            }
            const content = response.choices[0].message.content;
            // 尝试解析 JSON（处理可能的 markdown 代码块包裹）
            const json = extractJson(content);
            resolve(json);
          } catch (e) {
            reject(new Error('AI 返回格式异常: ' + e.message));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI 请求超时'));
    });

    req.write(requestBody);
    req.end();
  });
}

// ═══ 从 AI 回复中提取 JSON ═══
function extractJson(text) {
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e) {
    // 尝试提取 ```json ... ``` 代码块
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    // 尝试提取 { ... } 对象
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    throw new Error('无法解析 JSON: ' + text.substring(0, 200));
  }
}

// ═══ 标准化 & 补全默认值 ═══
function normalizeTripData(raw) {
  return {
    title: raw.title || '未命名旅行',
    destination: raw.destination || raw.meta?.destination || '',
    meta: {
      destination: raw.destination || raw.meta?.destination || '',
      recommendedDays: raw.meta?.recommendedDays || (raw.itinerary ? raw.itinerary.length : 3),
      language: raw.meta?.language || 'zh-CN',
      timezone: raw.meta?.timezone || 'auto',
      defaultLat: raw.meta?.defaultLat || raw.defaultLat || 39.9042,
      defaultLng: raw.meta?.defaultLng || raw.defaultLng || 116.4074,
      travelers: '',
      startDate: '',
      endDate: ''
    },
    itinerary: (raw.itinerary || []).map((day, i) => ({
      day: day.day || i + 1,
      date: day.date || '',
      theme: day.theme || `第${i + 1}天`,
      color: day.color || `db${(i % 3) + 1}`,
      activities: (day.activities || []).map(a => ({
        time: a.time || '',
        title: a.title || '',
        subtitle: a.subtitle || '',
        detail: a.detail || ''
      }))
    })),
    restaurants: (raw.restaurants || []).map(r => ({
      name: r.name || '',
      emoji: r.emoji || '🍽️',
      address: r.address || '',
      price: r.price || '',
      tags: (r.tags || []).map(t => ({
        label: t.label || '',
        type: t.type || 'local'
      })),
      description: r.description || '',
      recommend: r.recommend || ''
    })),
    tips: (raw.tips || []).map(t => ({
      title: t.title || '',
      color: t.color || '#64748B',
      body: Array.isArray(t.body) ? t.body : (t.body ? [t.body] : [])
    })),
    phrases: (raw.phrases || []).map(p => ({
      category: p.category || '',
      localLanguage: p.localLanguage || '',
      pronunciation: p.pronunciation || '',
      translation: p.translation || ''
    })),
    checklist: (raw.checklist || []).map(c => ({
      id: 'ai-' + Math.random().toString(36).substring(2, 9),
      text: c.text || '',
      category: c.category || '其他',
      done: false
    })),
    souvenirs: (raw.souvenirs || []).map(s => ({
      name: s.name || '',
      emoji: s.emoji || '🎁',
      price: s.price || '',
      where: s.where || '',
      description: s.description || ''
    })),
    weather: { enabled: true },
    flights: { enabled: false },
    budget: { totalBudget: 0 },
    theme: 'gold-emerald',
    isPublic: false
  };
}
