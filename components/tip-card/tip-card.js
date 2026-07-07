// ═══════════════════════════════════════════════
// tip-card 组件 — 旅行贴士卡片
// ═══════════════════════════════════════════════

var TIP_COLORS = ['#3B82F6', '#DC2626', '#F59E0B', '#10B981', '#EC4899', '#0D9488', '#7C3AED', '#F97316'];

Component({
  properties: {
    tip: {
      type: Object,
      value: { title: '', body: [], color: '#3B82F6' }
    },
    index: {
      type: Number,
      value: 0
    }
  },

  data: {
    displayColor: '#3B82F6'
  },

  observers: {
    'tip, index': function(tip, index) {
      var color = tip.color || TIP_COLORS[index % TIP_COLORS.length];
      this.setData({ displayColor: color });
    }
  }
});
