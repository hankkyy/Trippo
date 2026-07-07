// ═══════════════════════════════════════════════
// 云函数：getPublicTrip
// 根据 tripId 读取公开旅行数据（绕过 _openid 限制）
// 仅当 trip.isPublic === true 时返回
// ═══════════════════════════════════════════════

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { tripId } = event;

  if (!tripId) {
    return { success: false, error: '缺少 tripId 参数' };
  }

  try {
    const res = await db.collection('trips')
      .where({
        tripId: tripId,
        isPublic: true
      })
      .limit(1)
      .get();

    if (!res.data || res.data.length === 0) {
      return {
        success: false,
        error: '旅行不存在或未公开分享'
      };
    }

    return {
      success: true,
      data: res.data[0]
    };
  } catch (err) {
    console.error('getPublicTrip 失败:', err);
    return { success: false, error: err.message };
  }
};
