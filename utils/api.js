// ═══════════════════════════════════════════════
// 数据查询封装 — trip CRUD
// ═══════════════════════════════════════════════

const { collection, callFunction } = require('./cloudbase');

const TRIPS = 'trips';
const TEMPLATES = 'templates';

// ═══ 我的旅行 CRUD ═══

/**
 * 获取我的旅行列表（按更新时间倒序）
 * @returns {Promise<Array>}
 */
async function listMyTrips() {
  const db = collection(TRIPS);

  // CloudBase 小程序端自动通过 _openid 隔离数据
  const res = await db
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get();

  return res.data || [];
}

/**
 * 根据 tripId 获取单个旅行详情
 * 用于自己的旅行编辑（走 _openid 权限）
 * @param {string} tripId
 */
async function getMyTrip(tripId) {
  const db = collection(TRIPS);
  const res = await db
    .where({ tripId })
    .limit(1)
    .get();

  if (!res.data || res.data.length === 0) return null;
  return res.data[0];
}

/**
 * 通过云函数获取公开旅行（供分享查看，绕过 _openid 限制）
 * @param {string} tripId
 */
async function getPublicTrip(tripId) {
  return callFunction('getPublicTrip', { tripId });
}

/**
 * 新建旅行
 * @param {Object} data — 初始 trip 数据
 * @returns {Promise<{_id: string}>}
 */
async function createTrip(data) {
  const db = collection(TRIPS);
  const now = Date.now();

  const tripData = {
    ...data,
    isPublic: data.isPublic || false,
    theme: data.theme || 'gold-emerald',
    createdAt: now,
    updatedAt: now
  };

  const res = await db.add({ data: tripData });
  return { _id: res._id, ...tripData };
}

/**
 * 更新旅行
 * @param {string} docId — 文档 _id
 * @param {Object} data — 要更新的字段（支持嵌套路径如 "meta.startDate"）
 * @returns {Promise<{updated: number}>}
 */
async function updateTrip(docId, data) {
  const db = collection(TRIPS);
  const res = await db.doc(docId).update({
    data: {
      ...data,
      updatedAt: Date.now()
    }
  });
  return { updated: res.stats.updated };
}

/**
 * 删除旅行
 * @param {string} docId
 */
async function deleteTrip(docId) {
  const db = collection(TRIPS);
  await db.doc(docId).remove();
  return { deleted: true };
}

// ═══ 模板 ═══

/**
 * 获取模板列表（可选分类筛选）
 * 优先读本地兜底数据，再尝试云端
 * @param {string} category — 可选
 */
async function listTemplates(category = '') {
  try {
    const result = await callFunction('getTemplates', { category });
    if (result && result.success && result.data && result.data.length > 0) {
      return result.data;
    }
  } catch (err) {
    console.warn('云端模板加载失败，使用本地兜底数据', err);
  }

  // 本地兜底
  try {
    const localData = require('../data/default-templates.json');
    if (category && localData.length) {
      return localData.filter(t => t.category === category);
    }
    return localData;
  } catch (e) {
    return [];
  }
}

/**
 * 从模板复制创建旅行
 * @param {string} templateId
 */
async function copyTemplate(templateId) {
  const result = await callFunction('copyTemplate', { templateId });
  return result;
}

module.exports = {
  listMyTrips,
  getMyTrip,
  getPublicTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  listTemplates,
  copyTemplate
};
