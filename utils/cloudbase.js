// ═══════════════════════════════════════════════
// CloudBase 初始化 & 数据库实例
// ⚠️ ENV: 部署你自己的版本时，替换为你的 CloudBase 环境 ID
// ═══════════════════════════════════════════════

const ENV = 'cloud1-d9gr38v2je3c6e3c7';

/**
 * 获取数据库实例
 * 调用前确保 app.js 中已执行 wx.cloud.init()
 */
function getDB() {
  if (!wx.cloud) {
    throw new Error('wx.cloud 不可用，请升级基础库至 2.2.3 以上');
  }
  return wx.cloud.database();
}

/**
 * 获取集合引用
 */
function collection(name) {
  return getDB().collection(name);
}

/**
 * 获取云函数调用结果
 */
async function callFunction(name, data = {}) {
  try {
    const res = await wx.cloud.callFunction({ name, data });
    return res.result;
  } catch (err) {
    console.error(`云函数 ${name} 调用失败:`, err);
    throw err;
  }
}

module.exports = {
  ENV,
  getDB,
  collection,
  callFunction
};
