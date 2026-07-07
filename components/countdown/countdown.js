// ═══════════════════════════════════════════════
// countdown 组件 — SVG 环形倒计时
//   周长: 2 * π * 44 ≈ 276.46
//   stroke-dashoffset = 周长 * (1 - 进度比例)
// ═══════════════════════════════════════════════

const C = 2 * Math.PI * 44; // ≈ 276.46

function pad(n) {
  return String(n).padStart(2, '0');
}

Component({
  properties: {
    // 旅行开始日期
    startDate: {
      type: String,
      value: ''
    },
    // 旅行结束日期
    endDate: {
      type: String,
      value: ''
    }
  },

  data: {
    circ: C,
    d: '--', h: '--', m: '--', s: '--',
    dOffset: 0, hOffset: 0, mOffset: 0, sOffset: 0,
    isPast: false,
    daysPast: 0
  },

  lifetimes: {
    attached() {
      this._timer = null;
      this.tick();
      this._timer = setInterval(() => this.tick(), 1000);
    },

    detached() {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    }
  },

  methods: {
    tick() {
      const { startDate, endDate } = this.properties;
      if (!startDate) return;

      const now = new Date();
      const start = new Date(startDate);

      // 旅行已结束
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (now > end) {
          const daysPast = Math.floor((now - end) / 86400000);
          this.setData({
            isPast: true,
            daysPast: Math.max(0, daysPast)
          });
          return;
        }
      }

      // 旅行已经开始
      if (now >= start) {
        this.setData({
          d: 'GO', h: 'GO', m: 'GO', s: 'GO',
          dOffset: 0, hOffset: 0, mOffset: 0, sOffset: 0,
          isPast: false
        });
        return;
      }

      // 倒计时中
      const diff = start - now;
      if (diff <= 0) return;

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      this.setData({
        d: String(d),
        h: pad(h),
        m: pad(m),
        s: pad(s),
        dOffset: C * (1 - Math.min(d / 30, 1)),
        hOffset: C * (1 - h / 24),
        mOffset: C * (1 - m / 60),
        sOffset: C * (1 - s / 60),
        isPast: false
      });
    }
  }
});
