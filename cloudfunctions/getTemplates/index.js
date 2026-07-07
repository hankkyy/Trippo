// ═══════════════════════════════════════════════
// 云函数：getTemplates
// 获取模板列表，支持分类筛选和搜索
// ═══════════════════════════════════════════════

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { category = '', keyword = '' } = event;

  try {
    let query = db.collection('templates');

    // 分类筛选
    if (category) {
      query = query.where({ category });
    }

    // 搜索关键词（标题模糊匹配）
    if (keyword) {
      query = query.where({
        title: db.RegExp({
          regexp: keyword,
          options: 'i'
        })
      });
    }

    const res = await query
      .orderBy('useCount', 'desc')
      .limit(50)
      .get();

    return {
      success: true,
      data: res.data || []
    };
  } catch (err) {
    console.error('getTemplates 失败:', err);
    return { success: false, error: err.message, data: [] };
  }
};
