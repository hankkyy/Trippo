// ═══════════════════════════════════════════════
// proxyWeather — Open-Meteo API 代理
//   避免小程序直连外部 API 的域名白名单问题
// ═══════════════════════════════════════════════
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const lat = event.lat || 39.9042;
  const lng = event.lng || 116.4074;
  const forecastDays = event.forecastDays || 5;

  const url = 'https://api.open-meteo.com/v1/forecast?' +
    'latitude=' + lat +
    '&longitude=' + lng +
    '&current=temperature_2m,relative_humidity_2m,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
    '&hourly=temperature_2m,weather_code,precipitation_probability' +
    '&timezone=auto' +
    '&forecast_days=' + forecastDays;

  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('JSON parse error'));
          }
        });
      }).on('error', reject);
    });

    return { success: true, data: data };
  } catch (err) {
    console.error('proxyWeather error:', err);
    return { success: false, error: err.message };
  }
};
