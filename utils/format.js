// ═══════════════════════════════════════════════
// 格式化工具
// ═══════════════════════════════════════════════

/**
 * 补零
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * 格式化日期范围
 * "2026-07-23" → "7/23"
 * ["2026-07-23", "2026-07-26"] → "7/23 – 7/26"
 */
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDateRange(startDate, endDate) {
  if (!startDate) return '';
  const start = fmtDate(startDate);
  if (!endDate) return start;
  const end = fmtDate(endDate);
  if (start === end) return start;
  return `${start} – ${end}`;
}

/**
 * 格式化完整日期
 * "2026-07-23" → "7/23 周四"
 */
function fmtDateFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} ${weekday}`;
}

/**
 * 计算旅行剩余天数（距离出发）
 * @param {string} startDate
 * @returns {{ days: number, text: string, isPast: boolean }}
 */
function countdownToTrip(startDate) {
  if (!startDate) return { days: 0, text: '--', isPast: false };

  const now = new Date();
  const start = new Date(startDate);
  const diff = start.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);

  if (days < 0) {
    return {
      days: Math.abs(days),
      text: `已结束 ${Math.abs(days)} 天`,
      isPast: true
    };
  }
  if (days === 0) {
    return { days: 0, text: '今天出发！', isPast: false };
  }
  return { days, text: `还有 ${days} 天`, isPast: false };
}

/**
 * 计算精确倒计时数值（用于环形进度条）
 * @param {string} startDate
 * @returns {{ d: number, h: number, m: number, s: number, isPast: boolean }}
 */
function countdownDetailed(startDate) {
  if (!startDate) return { d: 0, h: 0, m: 0, s: 0, isPast: false };

  const now = new Date();
  const start = new Date(startDate);
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) {
    return { d: 0, h: 0, m: 0, s: 0, isPast: true };
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return { d, h, m, s, isPast: false };
}

/**
 * 格式化金额
 * @param {number} amount
 * @param {string} currency — CNY/USD/VND
 */
function fmtAmount(amount, currency) {
  if (currency === 'VND') {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₫`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k ₫`;
    return `${amount} ₫`;
  }
  if (currency === 'USD') return `$${amount.toFixed(2)}`;
  if (currency === 'CNY') return `¥${amount.toFixed(0)}`;
  return `${amount}`;
}

/**
 * 换算成人民币（用于汇总对比）
 * 汇率（2026年7月参考）：
 *   1 CNY = 1
 *   1 USD = 6.80 CNY
 *   1 VND = 1/3880 CNY ≈ 0.0002577
 */
function toCNY(amount, currency) {
  const rates = {
    CNY: 1,
    USD: 6.80,
    VND: 1 / 3880
  };
  return amount * (rates[currency] || 1);
}

/**
 * 计算人均花费
 * @param {Object} expense — { amount, currency, splitType, people }
 */
function perPersonRMB(expense) {
  const rmbTotal = toCNY(expense.amount, expense.currency);
  if (expense.splitType === 'perPerson') return rmbTotal;
  return rmbTotal / (expense.people || 2);
}

module.exports = {
  pad,
  fmtDate,
  fmtDateRange,
  fmtDateFull,
  countdownToTrip,
  countdownDetailed,
  fmtAmount,
  toCNY,
  perPersonRMB
};
