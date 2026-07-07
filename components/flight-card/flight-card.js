// ═══════════════════════════════════════════════
// flight-card 组件逻辑
//   properties: { flights: Object } — trip.flights
//   自动切换去程/回程 tab，点击展开额外信息
// ═══════════════════════════════════════════════

Component({
  properties: {
    flights: {
      type: Object,
      value: null
    }
  },

  data: {
    activeTab: 'outbound',
    tapped: false,
    hasBoth: false,
    currentFlight: null
  },

  observers: {
    'flights, activeTab'(flights, activeTab) {
      if (!flights) {
        this.setData({ currentFlight: null, hasBoth: false });
        return;
      }
      const hasBoth = !!(flights.outbound && flights.inbound);

      // 如果只有回程，自动切到回程 tab
      let tab = activeTab;
      if (!flights.outbound && flights.inbound) {
        tab = 'inbound';
      }

      this.setData({
        hasBoth,
        currentFlight: tab === 'outbound' ? (flights.outbound || null) : (flights.inbound || null),
        activeTab: tab,
        tapped: false
      });
    }
  },

  methods: {
    // 切换去程/回程
    onSwitchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ activeTab: tab });
    },

    // 点击卡片展开/收起额外信息
    onToggle() {
      this.setData({ tapped: !this.data.tapped });
    }
  }
});
