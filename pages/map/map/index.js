// ═══════════════════════════════════════════════
// 地图页 — 微信原生 <map> 组件
//   加载 trip 数据的 markers + 分类筛选
//   点击 marker 弹出自定义底部 popup
// ═══════════════════════════════════════════════

const api = require('../../../utils/api');
const { fmtAmount } = require('../../../utils/format');

// marker 图标颜色（用本地图片路径，或用灰色圆形兜底）
const CAT_COLORS = {
  hotel: '#1A6B4A',
  sight: '#7C3AED',
  food: '#F59E0B',
  shop: '#EC4899',
  transport: '#3B82F6',
  other: '#64748B'
};

const CAT_LABELS = {
  hotel: '🏨 酒店',
  sight: '🏛 景点',
  food: '🍜 美食',
  shop: '🛍️ 购物',
  transport: '🚗 交通',
  other: '📍 其他'
};

Page({
  data: {
    tripId: '',
    loading: true,
    error: false,
    errorMsg: '',

    // 地图配置
    latitude: 39.9042,
    longitude: 116.4074,
    scale: 13,
    markers: [],
    allMarkers: [], // 未经筛选的完整 marker 列表

    // 分类筛选
    categories: [],
    activeCategory: '', // 空字符串 = 全部

    // 底部 popup
    showPopup: false,
    popupData: {},

    // polyline（暂不使用）
    polylines: []
  },

  onLoad(options) {
    const { tripId } = options;
    if (!tripId) {
      this.setData({ loading: false, error: true, errorMsg: '缺少旅行 ID' });
      return;
    }
    this.setData({ tripId });
    this.loadTrip();
  },

  async loadTrip() {
    this.setData({ loading: true, error: false });
    try {
      const trip = await api.getMyTrip(tripId);
      if (!trip) throw new Error('旅行不存在');
      this.processTrip(trip);
    } catch (err) {
      console.error('加载失败:', err);
      this.setData({ loading: false, error: true, errorMsg: err.message || '加载失败' });
    }
  },

  processTrip(trip) {
    const markers = [];
    const catSet = new Set();

    // 1. 酒店 marker
    if (trip.hotel && trip.hotel.name) {
      const lat = trip.hotel.lat || (trip.meta && trip.meta.defaultLat) || 39.9042;
      const lng = trip.hotel.lng || (trip.meta && trip.meta.defaultLng) || 116.4074;
      catSet.add('hotel');
      markers.push({
        id: 1,
        latitude: lat,
        longitude: lng,
        title: trip.hotel.name,
        iconPath: '/images/markers/marker-hotel.png',
        width: 32,
        height: 40,
        callout: {
          content: `🏩 ${trip.hotel.name}`,
          color: '#1E293B',
          fontSize: 13,
          borderRadius: 8,
          padding: 8,
          display: 'BYCLICK'
        },
        // 自定义数据
        _cat: 'hotel',
        _name: trip.hotel.name,
        _emoji: '🏩',
        _desc: trip.hotel.address || '',
        _lat: lat,
        _lng: lng
      });
    }

    // 2. 从 map.markers 加载（如果有的话）
    if (trip.map && trip.map.markers && trip.map.markers.length > 0) {
      let idCounter = markers.length + 1;
      trip.map.markers.forEach(m => {
        catSet.add(m.category || 'other');
        markers.push({
          id: idCounter++,
          latitude: m.lat,
          longitude: m.lng,
          title: m.name,
          iconPath: `/images/markers/marker-${m.category || 'other'}.png`,
          width: 32,
          height: 40,
          callout: {
            content: `${m.emoji || '📍'} ${m.name}`,
            color: '#1E293B',
            fontSize: 13,
            borderRadius: 8,
            padding: 8,
            display: 'BYCLICK'
          },
          _cat: m.category || 'other',
          _name: m.name,
          _emoji: m.emoji || '📍',
          _desc: m.description || '',
          _lat: m.lat,
          _lng: m.lng
        });
      });
    }

    // 3. 如果有 itinerary 中的坐标点，也加进来
    if (trip.itinerary && trip.itinerary.length > 0) {
      let idCounter = markers.length + 1;
      trip.itinerary.forEach(day => {
        (day.activities || []).forEach(a => {
          if (a.lat && a.lng) {
            catSet.add(a.spotType || 'sight');
            markers.push({
              id: idCounter++,
              latitude: a.lat,
              longitude: a.lng,
              title: a.title,
              iconPath: `/images/markers/marker-${a.spotType || 'sight'}.png`,
              width: 32,
              height: 40,
              callout: {
                content: `📍 ${a.title}`,
                color: '#1E293B',
                fontSize: 13,
                borderRadius: 8,
                padding: 8,
                display: 'BYCLICK'
              },
              _cat: a.spotType || 'sight',
              _name: a.title,
              _emoji: '📍',
              _desc: a.description || '',
              _lat: a.lat,
              _lng: a.lng
            });
          }
        });
      });
    }

    // 构建分类列表
    const categories = Array.from(catSet).map(cat => ({
      id: cat,
      label: CAT_LABELS[cat] || cat,
      color: CAT_COLORS[cat] || '#64748B'
    }));

    // 计算地图中心
    let centerLat = 39.9042;
    let centerLng = 116.4074;
    if (markers.length > 0) {
      const sumLat = markers.reduce((s, m) => s + m.latitude, 0);
      const sumLng = markers.reduce((s, m) => s + m.longitude, 0);
      centerLat = sumLat / markers.length;
      centerLng = sumLng / markers.length;
    } else if (trip.meta) {
      centerLat = trip.meta.defaultLat || 39.9042;
      centerLng = trip.meta.defaultLng || 116.4074;
    }

    this.setData({
      loading: false,
      latitude: centerLat,
      longitude: centerLng,
      markers: markers,
      allMarkers: markers,
      categories: categories
    });
  },

  // ═══ 分类筛选 ═══
  onFilter(e) {
    const cat = e.currentTarget.dataset.cat;
    const { activeCategory, allMarkers } = this.data;

    if (activeCategory === cat) {
      // 取消筛选，显示全部
      this.setData({
        activeCategory: '',
        markers: allMarkers
      });
      return;
    }

    const filtered = allMarkers.filter(m => m._cat === cat);
    this.setData({
      activeCategory: cat,
      markers: filtered
    });
  },

  // ═══ 点击 marker ═══
  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const marker = this.data.allMarkers.find(m => m.id === markerId);
    if (!marker) return;

    this.setData({
      showPopup: true,
      popupData: {
        name: marker._name,
        emoji: marker._emoji || '📍',
        desc: marker._desc,
        lat: marker._lat || marker.latitude,
        lng: marker._lng || marker.longitude,
        category: marker._cat
      }
    });
  },

  // ═══ 关闭 popup ═══
  onClosePopup() {
    this.setData({ showPopup: false });
  },

  // ═══ 打开外部地图导航 ═══
  onOpenLocation() {
    const { popupData } = this.data;
    if (!popupData.lat || !popupData.lng) return;

    wx.openLocation({
      latitude: popupData.lat,
      longitude: popupData.lng,
      name: popupData.name,
      scale: 16
    });
  },

  // ═══ 地图点击空白处关闭 popup ═══
  onMapTap() {
    if (this.data.showPopup) {
      this.setData({ showPopup: false });
    }
  }
});
