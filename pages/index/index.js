// ═══════════════════════════════════════════════
// Trippo 首页逻辑
// 我的旅行列表 + 下拉刷新 + 长按删除
// ═══════════════════════════════════════════════

const api = require('../../utils/api');
const { countdownToTrip, fmtDateRange } = require('../../utils/format');

Page({
  data: {
    trips: [],
    loading: true
  },

  onLoad() {
    this.loadTrips();
  },

  onShow() {
    // 从编辑页返回时刷新列表
    if (!this.data.loading) {
      this.loadTrips();
    }
  },

  async onPullDownRefresh() {
    await this.loadTrips();
    wx.stopPullDownRefresh();
  },

  // ═══ 加载旅行列表 ═══
  async loadTrips() {
    this.setData({ loading: true });

    try {
      const trips = await api.listMyTrips();

      // 为每个 trip 计算展示用的元数据
      const enriched = trips.map(trip => ({
        ...trip,
        // 倒计时文本
        countdown: countdownToTrip(trip.meta && trip.meta.startDate),
        // 格式化日期范围
        dateRange: fmtDateRange(
          trip.meta && trip.meta.startDate,
          trip.meta && trip.meta.endDate
        ),
        // 首日行程预览（最多3条）
        previewActivities: trip.itinerary &&
          trip.itinerary.length > 0 &&
          trip.itinerary[0].activities
          ? trip.itinerary[0].activities.slice(0, 3)
          : []
      }));

      this.setData({
        trips: enriched,
        loading: false
      });
    } catch (err) {
      console.error('加载旅行列表失败:', err);
      wx.showToast({
        title: '加载失败，下拉刷新重试',
        icon: 'none',
        duration: 2000
      });
      this.setData({ loading: false });
    }
  },

  // ═══ 点击旅行卡片 → 详情页 ═══
  onTapTrip(e) {
    const { trip } = e.detail;
    wx.navigateTo({
      url: `/pages/trip/detail/index?tripId=${trip.tripId}`
    });
  },

  // ═══ 长按删除 ═══
  onLongPressTrip(e) {
    const { trip } = e.detail;
    const title = trip.title || '未命名旅行';

    wx.showModal({
      title: '删除旅行计划',
      content: `确定要删除「${title}」吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#DC2626',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteTrip(trip._id);
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadTrips();
          } catch (err) {
            console.error('删除失败:', err);
            wx.showToast({ title: '删除失败', icon: 'error' });
          }
        }
      }
    });
  },

  // ═══ 新建旅行 → 编辑页 ═══
  onCreateTrip() {
    wx.navigateTo({
      url: '/pages/trip/edit/index'
    });
  },

  // ═══ 跳转模板库 ═══
  onGotoTemplates() {
    wx.switchTab({
      url: '/pages/templates/list/index'
    });
  },

  // ═══ 智能导入 ═══
  onAIImport() {
    wx.navigateTo({
      url: '/pages/import/index'
    });
  }
});
