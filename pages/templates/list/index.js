// ═══════════════════════════════════════════════
// 模板库列表页逻辑
//   分类筛选 + 从云端/本地加载模板
// ═══════════════════════════════════════════════

const api = require('../../../utils/api');

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: '城市', label: '🏙️ 城市' },
  { value: '海岛', label: '🏝️ 海岛' },
  { value: '自驾', label: '🚗 自驾' },
  { value: '美食', label: '🍜 美食' },
  { value: '蜜月', label: '💕 蜜月' }
];

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '',
    templates: [],
    loading: true
  },

  onLoad() {
    this.loadTemplates();
  },

  onShow() {
    // 从预览页返回时可能刷新
  },

  async onPullDownRefresh() {
    await this.loadTemplates();
    wx.stopPullDownRefresh();
  },

  // ═══ 加载模板列表 ═══
  async loadTemplates() {
    const { activeCategory } = this.data;
    this.setData({ loading: true });

    try {
      const templates = await api.listTemplates(activeCategory);
      this.setData({ templates, loading: false });
    } catch (err) {
      console.error('加载模板失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // ═══ 切换分类 ═══
  onSwitchCategory(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ activeCategory: value });
    this.loadTemplates();
  },

  // ═══ 点击模板 → 预览页 ═══
  onTapTemplate(e) {
    const template = e.currentTarget.dataset.template;
    const templateId = template.templateId || template._id;
    wx.navigateTo({
      url: `/pages/templates/preview/index?templateId=${templateId}`
    });
  }
});
