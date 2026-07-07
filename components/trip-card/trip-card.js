// ═══════════════════════════════════════════════
// trip-card 组件逻辑
// ═══════════════════════════════════════════════

Component({
  properties: {
    trip: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { trip: this.data.trip });
    },

    onLongPress() {
      this.triggerEvent('longpress', { trip: this.data.trip });
    }
  }
});
