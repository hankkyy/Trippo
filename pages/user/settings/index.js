// ═══════════════════════════════════════════════
// 设置页（「我的」Tab）
//   旅行统计、主题切换、清除缓存、关于
// ═══════════════════════════════════════════════

var api = require('../../../utils/api');
var { ENV } = require('../../../utils/cloudbase');
var app = getApp();

Page({
  data: {
    userInfo: null,
    hasLogin: false,

    // 统计
    tripCount: 0,
    totalDays: 0,
    totalRestos: 0,

    // 主题
    currentTheme: (app && app.globalData && app.globalData.currentTheme) || 'gold-emerald',
    themes: [
      { name: 'gold-emerald', label: '🏯 金绿', gold: '#C8974A', emerald: '#1A6B4A' },
      { name: 'ocean-blue', label: '🌊 海蓝', gold: '#3B82F6', emerald: '#1E40AF' },
      { name: 'sakura-pink', label: '🌸 樱花粉', gold: '#EC4899', emerald: '#BE185D' }
    ],

    // 缓存大小
    cacheSize: '计算中…',

    // 关于
    version: '1.0.0',
    repoUrl: 'https://github.com/hankkyy/trippo'
  },

  onShow: function() {
    this.loadStats();
    this.loadCacheSize();
  },

  loadStats: function() {
    var that = this;
    api.listMyTrips().then(function(trips) {
      if (!trips || trips.length === 0) {
        that.setData({ tripCount: 0, totalDays: 0, totalRestos: 0 });
        return;
      }
      var totalDays = 0;
      var totalRestos = 0;
      trips.forEach(function(t) {
        if (t.itinerary) totalDays += t.itinerary.length;
        if (t.restaurants) totalRestos += t.restaurants.length;
      });
      that.setData({
        tripCount: trips.length,
        totalDays: totalDays,
        totalRestos: totalRestos
      });
    }).catch(function() {
      // 未登录或无数据
      that.setData({ tripCount: 0, totalDays: 0, totalRestos: 0 });
    });
  },

  loadCacheSize: function() {
    var that = this;
    try {
      var res = wx.getStorageInfoSync();
      var sizeKB = (res.currentSize / 1024).toFixed(1);
      that.setData({ cacheSize: sizeKB + ' KB' });
    } catch (e) {
      that.setData({ cacheSize: '未知' });
    }
  },

  // ═══ 主题切换 ═══
  onThemeChange: function(e) {
    var theme = e.currentTarget.dataset.theme;
    this.setData({ currentTheme: theme });
    wx.setStorageSync('trippo_theme', theme);
    // 同步更新全局状态
    if (app && app.globalData) {
      app.globalData.currentTheme = theme;
    }
    wx.showToast({ title: '主题已切换', icon: 'success' });
  },

  // ═══ 清除缓存 ═══
  onClearCache: function() {
    var that = this;
    wx.showModal({
      title: '清除缓存',
      content: '将清除本地缓存数据（不影响云端数据）',
      success: function(res) {
        if (!res.confirm) return;
        try {
          wx.clearStorageSync();
          that.setData({ cacheSize: '0 KB' });
          wx.showToast({ title: '已清除', icon: 'success' });
        } catch (e) {
          wx.showToast({ title: '清除失败', icon: 'error' });
        }
      }
    });
  },

  // ═══ 复制环境 ID ═══
  onCopyEnvId: function() {
    wx.setClipboardData({
      data: ENV,
      success: function() {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  // ═══ 跳转 GitHub ═══
  onOpenRepo: function() {
    wx.setClipboardData({
      data: 'https://github.com/hankkyy/trippo',
      success: function() {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
  },

  // ═══ 获取用户信息 ═══
  onGetUserInfo: function(e) {
    if (e.detail && e.detail.userInfo) {
      this.setData({
        userInfo: e.detail.userInfo,
        hasLogin: true
      });
    }
  }
});
