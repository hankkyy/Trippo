// ═══════════════════════════════════════════════
// Trippo — 通用旅行计划小程序
// 入口文件：CloudBase 初始化 + 全局数据
// ═══════════════════════════════════════════════

App({
  onLaunch() {
    // 初始化 CloudBase
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    // ⚠️ 部署你自己的版本时，替换为你的 CloudBase 环境 ID
    wx.cloud.init({
      env: 'cloud1-d9gr38v2je3c6e3c7',
      traceUser: true
    });

    // 加载已保存的主题
    const savedTheme = wx.getStorageSync('trippo_theme');
    if (savedTheme && this.globalData.themes[savedTheme]) {
      this.globalData.currentTheme = savedTheme;
    }

    // 检查登录态
    this.checkLogin();
  },

  checkLogin() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        console.log('CloudBase 登录成功', res.result);
        this.globalData.openid = res.result.openid;
      },
      fail: err => {
        console.warn('CloudBase 登录失败（不影响匿名访问功能）', err);
      }
    });
  },

  globalData: {
    openid: null,
    userInfo: null,
    currentTheme: 'gold-emerald',
    // 三套主题色
    themes: {
      'gold-emerald': {
        gold: '#E8A87C',
        emerald: '#6DB58A',
        bg: '#FFFFFF'
      },
      'ocean-blue': {
        gold: '#8BA4B8',
        emerald: '#6B8CA0',
        bg: '#F5F7FA'
      },
      'sakura-pink': {
        gold: '#C49B9B',
        emerald: '#B88282',
        bg: '#FCF7F5'
      }
    }
  }
});
