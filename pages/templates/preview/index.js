// ═══════════════════════════════════════════════
// 模板预览页逻辑
//   加载模板数据 +「使用此模板」→ 云函数 copyTemplate
// ═══════════════════════════════════════════════

const api = require('../../../utils/api');

Page({
  data: {
    templateId: '',
    template: null,
    loading: true,
    creating: false
  },

  onLoad(options) {
    const { templateId } = options;
    if (!templateId) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ templateId });
    this.loadTemplate(templateId);
  },

  // ═══ 加载模板数据 ═══
  async loadTemplate(templateId) {
    this.setData({ loading: true });

    try {
      // 先尝试云端
      const templates = await api.listTemplates();
      const template = templates.find(t =>
        t.templateId === templateId || t._id === templateId
      );

      if (template) {
        this.setData({ template, loading: false });
        return;
      }

      // 本地兜底
      const localData = require('../../../data/default-templates.json');
      const local = localData.find(t =>
        t.templateId === templateId || t._id === templateId
      );

      if (local) {
        this.setData({ template: local, loading: false });
      } else {
        this.setData({ loading: false });
      }

    } catch (err) {
      console.error('加载模板失败:', err);
      this.setData({ loading: false });
    }
  },

  // ═══ 使用此模板 → 创建旅行 ═══
  async onUseTemplate() {
    const { templateId } = this.data;
    this.setData({ creating: true });

    try {
      const result = await api.copyTemplate(templateId);

      if (result && result.success && result.data) {
        const { tripId } = result.data;
        wx.showToast({ title: '创建成功！', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/trip/detail/index?tripId=${tripId}`
          });
        }, 1000);
      } else {
        throw new Error(result.error || '创建失败');
      }
    } catch (err) {
      console.error('使用模板失败:', err);
      wx.showToast({ title: '创建失败，请重试', icon: 'error' });
    } finally {
      this.setData({ creating: false });
    }
  }
});
