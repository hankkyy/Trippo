// ═══════════════════════════════════════════════
// checkUsage — 每日 AI 使用次数检查 & 自增
//   纯 DB 读写，< 1 秒，不会超时
// ═══════════════════════════════════════════════
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DAILY_LIMIT = 10;

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, error: '请先登录' };
  }

  const db = cloud.database();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const usageId = `${openid}_${today}`;

  const usageDoc = await db.collection('aiUsage')
    .where({ usageId }).limit(1).get();

  let todayCount = 0;
  if (usageDoc.data && usageDoc.data.length > 0) {
    todayCount = usageDoc.data[0].count || 0;
  }

  if (todayCount >= DAILY_LIMIT) {
    return {
      success: false,
      error: `今日免费次数已用完（${DAILY_LIMIT}/${DAILY_LIMIT}），明天再来 🌅`,
      remaining: 0,
      limit: DAILY_LIMIT
    };
  }

  const newCount = todayCount + 1;
  if (usageDoc.data && usageDoc.data.length > 0) {
    await db.collection('aiUsage').doc(usageDoc.data[0]._id)
      .update({ data: { count: newCount, updatedAt: Date.now() } });
  } else {
    await db.collection('aiUsage').add({
      data: { usageId, openid, date: today, count: 1, createdAt: Date.now(), updatedAt: Date.now() }
    });
  }

  return {
    success: true,
    remaining: DAILY_LIMIT - newCount,
    limit: DAILY_LIMIT
  };
};
