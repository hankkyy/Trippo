// ═══════════════════════════════════════════════
// activity-row 组件逻辑
// ═══════════════════════════════════════════════

Component({
  properties: {
    activity: {
      type: Object,
      value: {}
    },
    // 父组件传入的 day，用于判断"进行中"高亮
    day: {
      type: Number,
      value: 0
    }
  },

  methods: {
    onOpenMap() {
      const { activity } = this.data;
      const url = activity.mapUrl;
      if (!url) return;

      // 如果起点是 maps.google.com → 尝试用微信内置浏览器打开
      // 如果有 lat/lng → 跳转到地图页
      if (activity.lat && activity.lng) {
        wx.navigateTo({
          url: `/pages/map/map/index?lat=${activity.lat}&lng=${activity.lng}&title=${encodeURIComponent(activity.title || '')}`
        });
      } else {
        // 复制链接或打开 webview
        wx.setClipboardData({
          data: url,
          success: () => {
            wx.showToast({ title: '已复制地图链接', icon: 'success' });
          }
        });
      }
    }
  }
});
