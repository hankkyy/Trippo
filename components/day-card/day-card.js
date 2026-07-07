// ═══════════════════════════════════════════════
// day-card 组件逻辑
//   接收 dayData, isToday → 折叠/展开
// ═══════════════════════════════════════════════

Component({
  properties: {
    dayData: {
      type: Object,
      value: { day: 1, date: '', theme: '', color: 'db1', activities: [] }
    },
    isToday: {
      type: Boolean,
      value: false
    }
  },

  data: {
    expanded: false,
    barClass: 'db1',
    peekActivities: []
  },

  observers: {
    'dayData'(val) {
      if (!val) return;
      // 颜色 class
      const barClass = val.color || 'db1';
      // 前4个活动作为 peek 预览
      const peekActivities = (val.activities || []).slice(0, 4);
      this.setData({ barClass, peekActivities });
    },

    'isToday'(val) {
      // 如果是今天，默认展开
      if (val) {
        this.setData({ expanded: true });
      }
    }
  },

  methods: {
    onToggle() {
      this.setData({ expanded: !this.data.expanded });
    }
  }
});
