// ═══════════════════════════════════════════════
// 云函数：copyTemplate
// 从模板复制数据到用户的 trips 集合
// 输入 templateId → 返回新创建的 trip
// ═══════════════════════════════════════════════

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 生成简单 UUID
function uuid() {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) s += '-';
  }
  return s;
}

exports.main = async (event, context) => {
  const { templateId } = event;
  const { OPENID } = cloud.getWXContext();

  if (!templateId) {
    return { success: false, error: '缺少 templateId 参数' };
  }

  if (!OPENID) {
    return { success: false, error: '未获取到用户身份' };
  }

  try {
    // 1. 读取模板
    const tplRes = await db.collection('templates')
      .where({ templateId })
      .limit(1)
      .get();

    if (!tplRes.data || tplRes.data.length === 0) {
      return { success: false, error: '模板不存在' };
    }

    const template = tplRes.data[0];
    const now = Date.now();
    const tripId = uuid();

    // 2. 构建新 trip 数据（只复制预填字段，不复制 _openid）
    const tripData = {
      tripId,
      title: template.title,
      coverImage: template.coverImage || '',
      meta: template.meta || {},
      itinerary: template.itinerary || [],
      restaurants: template.restaurants || [],
      tips: template.tips || [],
      phrases: template.phrases || [],
      checklist: template.checklist || [],
      flights: { enabled: false },
      hotel: null,
      souvenirs: [],
      spa: { enabled: false },
      budget: {
        currencies: ['CNY'],
        exchangeRates: { CNY: 1 },
        totalBudget: 0,
        items: []
      },
      expenses: [],
      isPublic: false,
      theme: 'gold-emerald',
      createdAt: now,
      updatedAt: now
    };

    // 3. 写入 trips 集合（_openid 由云函数自动添加）
    const addRes = await db.collection('trips').add({ data: tripData });

    // 4. 模板使用次数 +1
    await db.collection('templates').doc(template._id).update({
      data: {
        useCount: db.command.inc(1)
      }
    });

    return {
      success: true,
      data: {
        _id: addRes._id,
        tripId
      }
    };
  } catch (err) {
    console.error('copyTemplate 失败:', err);
    return { success: false, error: err.message };
  }
};
