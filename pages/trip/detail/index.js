// ═══════════════════════════════════════════════
// 旅行详情页逻辑 — Trippo 核心页面
//   支持创建者模式（编辑/分享/公开控制）
//   支持分享查看模式（只读 + 引导创建）
// ═══════════════════════════════════════════════

const api = require('../../../utils/api');
const { fmtDateRange, fmtAmount } = require('../../../utils/format');

Page({
  data: {
    trip: {},
    tripId: '',
    isOwner: true,
    loading: true,
    error: false,
    errorMsg: '',

    // Hero 轮播图（默认 + trip.coverImage）
    heroImages: [],
    dateRange: '',
    budgetText: '--',
    currentDay: 0,

    // 餐厅预览（前4条）
    previewRestos: [],

    // 快捷导航
    quickNav: [
      { id: 'hotel', icon: '🏨', label: '酒店', url: '' },
      { id: 'resto', icon: '🍜', label: '餐厅', url: '' },
      { id: 'budget', icon: '💰', label: '记账', url: '' },
      { id: 'checklist', icon: '✅', label: '清单', url: '' },
      { id: 'souvenir', icon: '🛍️', label: '伴手礼', url: '' },
      { id: 'tips', icon: '💡', label: '贴士', url: '' },
      { id: 'phrases', icon: '🗣️', label: '常用语', url: '' },
      { id: 'map', icon: '🗺️', label: '地图', url: '' }
    ]
  },

  onLoad(options) {
    const { tripId, fromShare } = options;

    if (!tripId) {
      this.setData({
        loading: false,
        error: true,
        errorMsg: '缺少旅行 ID'
      });
      return;
    }

    this.setData({ tripId, isOwner: !fromShare });
    this.loadTrip();
  },

  onShareAppMessage() {
    const { trip } = this.data;
    return {
      title: `${trip.title || '旅行计划'} ${trip.meta && trip.meta.destination ? '· ' + trip.meta.destination : ''} 🏝️`,
      path: `/pages/trip/detail/index?tripId=${this.data.tripId}&fromShare=1`,
      imageUrl: trip.coverImage || ''
    };
  },

  // ═══ 加载旅行数据 ═══
  async loadTrip() {
    const { tripId, isOwner } = this.data;
    this.setData({ loading: true, error: false });

    try {
      let trip;

      if (isOwner) {
        trip = await api.getMyTrip(tripId);
      } else {
        const result = await api.getPublicTrip(tripId);
        if (result && result.success) {
          trip = result.data;
        } else {
          throw new Error(result.error || '旅行不存在或未公开');
        }
      }

      if (!trip) {
        throw new Error('旅行不存在');
      }

      this.processTrip(trip);

    } catch (err) {
      console.error('加载旅行数据失败:', err);
      this.setData({
        loading: false,
        error: true,
        errorMsg: err.message || '加载失败，请重试'
      });
    }
  },

  processTrip(trip) {
    // Hero 轮播图
    const heroImages = [];
    if (trip.coverImage) heroImages.push(trip.coverImage);

    // 日期范围
    const dateRange = trip.meta
      ? fmtDateRange(trip.meta.startDate, trip.meta.endDate)
      : '';

    // 预算文本
    const totalBudget = trip.budget && trip.budget.totalBudget
      ? fmtAmount(trip.budget.totalBudget, 'CNY')
      : '--';
    const budgetText = trip.budget && trip.budget.totalBudget
      ? `${totalBudget}/人`
      : '未设定';

    // 当前是行程第几天
    let currentDay = 0;
    if (trip.meta && trip.meta.startDate) {
      const now = new Date();
      const start = new Date(trip.meta.startDate);
      const diffDays = Math.floor((now - start) / 86400000);
      if (diffDays >= 0 && trip.itinerary) {
        const dayNum = diffDays + 1;
        if (trip.itinerary.find(d => d.day === dayNum)) {
          currentDay = dayNum;
        }
      }
    }

    // 餐厅预览（前4条）
    const previewRestos = (trip.restaurants || []).slice(0, 4);

    // 更新快捷导航的 URL
    const quickNav = this.data.quickNav.map(item => {
      let url = '';
      switch (item.id) {
        case 'budget': url = `/pages/trip/budget/index?tripId=${trip.tripId}`; break;
        case 'checklist': url = `/pages/trip/checklist/index?tripId=${trip.tripId}`; break;
        case 'resto': url = `/pages/trip/restaurants/index?tripId=${trip.tripId}`; break;
        case 'map': url = `/pages/map/map/index?tripId=${trip.tripId}`; break;
      }
      return { ...item, url };
    });

    this.setData({
      trip,
      heroImages,
      dateRange,
      budgetText,
      currentDay,
      previewRestos,
      quickNav,
      loading: false
    });
  },

  // ═══ 标签 class ═══
  // 兼容两种格式：字符串（如 "Bib Gourmand"）或对象（{label, type}）
  getTagClass: function(tag) {
    if (!tag) return '';
    var type = '';
    if (typeof tag === 'string') {
      if (tag.indexOf('Michelin') >= 0 || tag.indexOf('米其林') >= 0) type = 'mich';
      else if (tag.indexOf('Bib') >= 0) type = 'bib';
      else type = 'local';
    } else {
      type = tag.type || 'local';
    }
    if (type === 'mich') return 'tag-michelin';
    if (type === 'bib') return 'tag-bib';
    return 'tag-local';
  },

  // ═══ 快捷导航点击 ═══
  onNavigate(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) {
      wx.showToast({ title: '即将上线', icon: 'none' });
      return;
    }
    wx.navigateTo({ url });
  },

  // ═══ 编辑旅行 ═══
  onEdit() {
    wx.navigateTo({
      url: `/pages/trip/edit/index?tripId=${this.data.tripId}`
    });
  },

  // ═══ 切换公开/私密 ═══
  async onTogglePublic() {
    const { trip } = this.data;
    const newPublic = !trip.isPublic;

    try {
      await api.updateTrip(trip._id, { isPublic: newPublic });
      this.setData({
        'trip.isPublic': newPublic
      });
      wx.showToast({
        title: newPublic ? '已设为公开' : '已设为私密',
        icon: 'success'
      });
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  // ═══ 查看者 → 我也要创建 ═══
  onCreateMyOwn() {
    wx.switchTab({ url: '/pages/templates/list/index' });
  },

  // ═══ 重试 ═══
  onRetry() {
    this.loadTrip();
  }
});
