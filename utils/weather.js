// ═══════════════════════════════════════════════
// Open-Meteo 天气 API 调用
// 小程序中通过 wx.request 直连（需在后台加白名单）
// 或通过 CloudBase 云函数代理（推荐，避免跨域和审核问题）
// ═══════════════════════════════════════════════

// ═══ 天气图标映射 ═══
const WEATHER_ICONS = {
  0: '☀️',   // 晴
  1: '🌤️',  // 少云
  2: '⛅',   // 多云
  3: '☁️',  // 阴
  45: '🌫️', // 雾
  51: '🌦️', // 小雨
  53: '🌦️',
  55: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  80: '🌦️',
  81: '🌧️',
  82: '⛈️',
  95: '⛈️'
};

const WEATHER_DESC = {
  0: '晴',
  1: '少云',
  2: '多云',
  3: '阴',
  45: '雾',
  51: '小雨',
  53: '小雨',
  55: '中雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  80: '阵雨',
  81: '阵雨',
  82: '暴雨',
  95: '雷暴'
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// ═══ 获取天气数据 ═══

/**
 * 调用 Open-Meteo API 获取天气
 * 推荐通过云函数代理，避免域名白名单问题
 *
 * @param {number} lat — 纬度
 * @param {number} lng — 经度
 * @param {number} forecastDays — 预报天数（1-16）
 * @returns {Promise<Object>} { current, daily, hourly }
 */
async function fetchWeather(lat = 39.9042, lng = 116.4074, forecastDays = 5) {
  try {
    // 方案一：通过云函数代理
    const result = await wx.cloud.callFunction({
      name: 'proxyWeather',
      data: { lat, lng, forecastDays }
    });
    if (result.result && result.result.success) {
      return formatWeatherResponse(result.result.data);
    }
  } catch (err) {
    console.warn('云函数天气代理失败，尝试直连...', err);
  }

  // 方案二：直连 Open-Meteo（需在微信后台白名单 api.open-meteo.com）
  try {
    const data = await new Promise((resolve, reject) => {
      wx.request({
        url: 'https://api.open-meteo.com/v1/forecast',
        data: {
          latitude: lat,
          longitude: lng,
          current: 'temperature_2m,relative_humidity_2m,weather_code',
          daily: 'temperature_2m_max,temperature_2m_min,weather_code',
          hourly: 'temperature_2m,weather_code,precipitation_probability',
          timezone: 'auto',
          forecast_days: forecastDays
        },
        success: (res) => resolve(res.data),
        fail: reject
      });
    });
    return formatWeatherResponse(data);
  } catch (err) {
    console.error('天气获取失败:', err);
    return getFallbackWeather();
  }
}

/**
 * 格式化 Open-Meteo 原始响应为前端友好结构
 */
function formatWeatherResponse(raw) {
  if (!raw || !raw.current) return getFallbackWeather();

  const { current, daily, hourly } = raw;

  // 当前天气
  const currentWeather = {
    temp: Math.round(current.temperature_2m),
    humidity: current.relative_humidity_2m,
    icon: WEATHER_ICONS[current.weather_code] || '🌡️',
    desc: WEATHER_DESC[current.weather_code] || '',
    code: current.weather_code
  };

  // 逐日预报
  const dailyForecast = [];
  if (daily && daily.time) {
    for (let i = 0; i < daily.time.length; i++) {
      const date = new Date(daily.time[i]);
      const wc = daily.weather_code[i];
      dailyForecast.push({
        date: daily.time[i],
        dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
        weekday: WEEKDAYS[date.getDay()],
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        icon: WEATHER_ICONS[wc] || '🌡️',
        desc: WEATHER_DESC[wc] || '',
        code: wc,
        isToday: i === 0,
        // 对应的逐小时数据 key
        dateKey: daily.time[i]
      });
    }
  }

  // 逐小时预报（按日期分组）
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
        precip: hourly.precipitation_probability[i]
      });
    }
  }

  return {
    current: currentWeather,
    daily: dailyForecast,
    hourlyByDate
  };
}

/**
 * 天气加载失败时的兜底数据
 */
function getFallbackWeather() {
  return {
    current: {
      temp: '--',
      humidity: '--',
      icon: '🌡️',
      desc: '天气加载失败',
      code: -1
    },
    daily: [],
    hourlyByDate: {}
  };
}

module.exports = {
  fetchWeather,
  WEATHER_ICONS,
  WEATHER_DESC,
  WEEKDAYS
};
