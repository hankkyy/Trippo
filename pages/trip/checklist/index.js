// ═══════════════════════════════════════════════
// 出发清单 — 分类勾选 + 进度条
//   数据存储在 trip.checklist 数组字段
// ═══════════════════════════════════════════════

const api = require('../../../utils/api');

Page({
  data: {
    tripId: '',
    trip: {},
    loading: true,
    error: false,
    errorMsg: '',

    // 按分类分组的清单
    groupedItems: [],

    // 进度
    totalItems: 0,
    doneItems: 0,
    progressPct: 0
  },

  onLoad(options) {
    const { tripId } = options;
    if (!tripId) {
      this.setData({ loading: false, error: true, errorMsg: '缺少旅行 ID' });
      return;
    }
    this.setData({ tripId });
    this.loadTrip();
  },

  async loadTrip() {
    this.setData({ loading: true, error: false });
    try {
      const trip = await api.getMyTrip(this.data.tripId);
      if (!trip) throw new Error('旅行不存在');
      this.processTrip(trip);
    } catch (err) {
      console.error('加载失败:', err);
      this.setData({ loading: false, error: true, errorMsg: err.message || '加载失败' });
    }
  },

  processTrip(trip) {
    const checklist = trip.checklist || [];

    // 按分类分组
    const catMap = {};
    checklist.forEach(item => {
      const cat = item.category || '其他';
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, items: [], doneCount: 0, totalCount: 0 };
      }
      catMap[cat].items.push(item);
      catMap[cat].totalCount++;
      if (item.done) catMap[cat].doneCount++;
    });

    const groupedItems = Object.values(catMap);

    const totalItems = checklist.length;
    const doneItems = checklist.filter(item => item.done).length;
    const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    this.setData({
      loading: false,
      trip,
      groupedItems,
      totalItems,
      doneItems,
      progressPct
    });
  },

  // ═══ 切换勾选状态 ═══
  async onToggle(e) {
    const { catIndex, itemIndex } = e.currentTarget.dataset;
    const groupedItems = [...this.data.groupedItems];
    const item = groupedItems[catIndex].items[itemIndex];
    item.done = !item.done;

    // 更新分组统计
    groupedItems[catIndex].doneCount = groupedItems[catIndex].items.filter(i => i.done).length;

    // 计算总体进度
    const allItems = groupedItems.flatMap(g => g.items);
    const doneItems = allItems.filter(i => i.done).length;
    const progressPct = allItems.length > 0 ? Math.round((doneItems / allItems.length) * 100) : 0;

    this.setData({ groupedItems, doneItems, progressPct });

    // 持久化到云端
    const checklist = allItems.map(({ id, text, category, done, description }) => ({
      id, text, category, done, description
    }));

    try {
      await api.updateTrip(this.data.trip._id, { checklist });
    } catch (err) {
      // 静默失败，本地状态已更新
      console.warn('清单同步失败:', err);
    }
  }
});
