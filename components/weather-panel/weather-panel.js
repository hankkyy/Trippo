// ═══════════════════════════════════════════════
// weather-panel 组件逻辑
//   接收 lat/lng → 调用 Open-Meteo → 渲染
//   点击逐日卡片展示逐小时详情
// ═══════════════════════════════════════════════

const { fetchWeather } = require('../../utils/weather');

// 天气图标/描述映射
const WEATHER_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  80: '🌦️', 81: '🌧️', 82: '⛈️', 95: '⛈️'
};

const WEATHER_DESC = {
  0: '晴', 1: '少云', 2: '多云', 3: '阴', 45: '雾',
  51: '小雨', 53: '小雨', 55: '中雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  80: '阵雨', 81: '阵雨', 82: '暴雨', 95: '雷暴'
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

Component({
  properties: {
    lat: { type: Number, value: 39.9042 },
    lng: { type: Number, value: 116.4074 }
  },

  data: {
    loading: true,
    error: false,
    showDaily: false,
    current: { temp: '--', humidity: '--', icon: '🌡️', desc: '' },
    daily: [],
    hourly: [],
    selectedDate: '',
    hourlyByDate: {}
  },

  lifetimes: {
    attached() {
      this.loadWeather();
    }
  },

  observers: {
    'lat, lng'() {
      this.loadWeather();
    }
  },

  methods: {
    async loadWeather() {
      const { lat, lng } = this.properties;
      this.setData({ loading: true, error: false });

      try {
        const result = await this.fetchWeatherDirect(lat, lng);
        this.processWeather(result);
      } catch (err) {
        console.error('天气加载失败:', err);
        this.setData({ loading: false, error: true });
      }
    },

    async fetchWeatherDirect(lat, lng) {
      // 通过云函数代理（生产环境推荐）
      try {
        const res = await wx.cloud.callFunction({
          name: 'proxyWeather',
          data: { lat, lng, forecastDays: 5 }
        });
        if (res.result && res.result.success) {
          return res.result.data;
        }
      } catch (e) {
        console.warn('云函数天气代理失败，尝试直连');
      }

      // 直连 Open-Meteo（需要域名白名单）
      return new Promise((resolve, reject) => {
        wx.request({
          url: 'https://api.open-meteo.com/v1/forecast',
          data: {
            latitude: lat,
            longitude: lng,
            current: 'temperature_2m,relative_humidity_2m,weather_code',
            daily: 'temperature_2m_max,temperature_2m_min,weather_code',
            hourly: 'temperature_2m,weather_code,precipitation_probability',
            timezone: 'auto',
            forecast_days: 5
          },
          success: (res) => resolve(res.data),
          fail: reject
        });
      });
    },

    processWeather(raw) {
      if (!raw || !raw.current) {
        this.setData({ loading: false, error: true });
        return;
      }

      const { current, daily, hourly } = raw;

      // 当前天气
      const cur = {
        temp: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        icon: WEATHER_ICONS[current.weather_code] || '🌡️',
        desc: WEATHER_DESC[current.weather_code] || '',
        code: current.weather_code
      };

      // 逐日预报
      const dailyList = [];
      if (daily && daily.time) {
        for (let i = 0; i < daily.time.length; i++) {
          const date = new Date(daily.time[i]);
          const wc = daily.weather_code[i];
          dailyList.push({
            date: daily.time[i],
            dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
            weekday: WEEKDAYS[date.getDay()],
            tempMax: Math.round(daily.temperature_2m_max[i]),
            tempMin: Math.round(daily.temperature_2m_min[i]),
            icon: WEATHER_ICONS[wc] || '🌡️',
            desc: WEATHER_DESC[wc] || '',
            code: wc,
            isToday: i === 0
          });
        }
      }

      // 逐小时分组
      const hourlyByDate = {};
      if (hourly && hourly.time) {
        for (let i = 0; i < hourly.time.length; i++) {
          const dateKey = hourly.time[i].substring(0, 10);
          if (!hourlyByDate[dateKey]) hourlyByDate[dateKey] = [];
          hourlyByDate[dateKey].push({
            time: hourly.time[i].substring(11, 16),
            temp: Math.round(hourly.temperature_2m[i]),
            code: hourly.weather_code[i],
            icon: WEATHER_ICONS[hourly.weather_code[i]] || '🌡️',
            desc: WEATHER_DESC[hourly.weather_code[i]] || '',
            precip: hourly.precipitation_probability[i],
            isNow: false
          });
        }
      }

      this.setData({
        loading: false,
        showDaily: true,
        current: cur,
        daily: dailyList,
        hourlyByDate,
        selectedDate: ''
      });
    },

    onToggleDetail() {
      this.setData({ showDaily: !this.data.showDaily });
    },

    onSelectDay(e) {
      const date = e.currentTarget.dataset.date;
      const { selectedDate, hourlyByDate } = this.data;

      // 如果点击已选中的天 → 收起
      if (selectedDate === date) {
        this.setData({ selectedDate: '', hourly: [] });
        return;
      }

      const hours = hourlyByDate[date] || [];

      // 标记"当前小时"
      const now = new Date();
      const nowDateKey = now.toISOString().substring(0, 10);
      const nowHour = now.getHours();
      const processed = hours.map(h => ({
        ...h,
        isNow: date === nowDateKey && parseInt(h.time) === nowHour
      }));

      this.setData({
        selectedDate: date,
        hourly: processed
      });
    }
  }
});
