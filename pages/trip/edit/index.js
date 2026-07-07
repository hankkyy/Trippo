// ═══════════════════════════════════════════════
// 编辑旅行页逻辑
//   新建模式：空白表单 +「创建旅行」
//   编辑模式：加载已有数据 +「保存修改」+ 删除按钮
// ═══════════════════════════════════════════════

const api = require('../../../utils/api');

// UUID 生成
function uuid() {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) s += '-';
  }
  return s;
}

// 默认空白表单
function emptyForm() {
  return {
    coverImage: '',
    title: '',
    theme: 'gold-emerald',
    meta: { destination: '', travelers: '', startDate: '', endDate: '' },
    flights: {
      enabled: false,
      outbound: { airline: '', flightNo: '', depAirport: '', depCode: '', depTime: '', depDate: '', arrAirport: '', arrCode: '', arrTime: '', arrDate: '', aircraft: '', duration: '', note: '' },
      inbound: { airline: '', flightNo: '', depAirport: '', depCode: '', depTime: '', depDate: '', arrAirport: '', arrCode: '', arrTime: '', arrDate: '', aircraft: '', duration: '', note: '' }
    },
    hotel: { name: '', address: '', tags: '', roomType: '', checkIn: '', checkOut: '' },
    budget: { totalBudget: 0 },
    itinerary: [],
    restaurants: [],
    weather: { enabled: true, lat: 39.9042, lng: 116.4074 }
  };
}

// 主题列表
const THEMES = [
  { value: 'gold-emerald', label: '金绿', swatch: '#C8974A' },
  { value: 'ocean-blue', label: '海蓝', swatch: '#3B82F6' },
  { value: 'sakura-pink', label: '樱花粉', swatch: '#EC4899' }
];

// 航班字段定义
const FLIGHT_FIELDS = [
  { key: 'airline', label: '航空公司', placeholder: '如：深圳航空', section: 'outbound' },
  { key: 'flightNo', label: '航班号', placeholder: '如：ZH107', section: 'outbound' },
  { key: 'depAirport', label: '出发机场', placeholder: '如：深圳宝安', section: 'outbound' },
  { key: 'depCode', label: '出发三字码', placeholder: '如：SZX', section: 'outbound' },
  { key: 'depTime', label: '出发时间', placeholder: '如：00:05', section: 'outbound' },
  { key: 'depDate', label: '出发日期', placeholder: '如：7/23', section: 'outbound' },
  { key: 'arrAirport', label: '到达机场', placeholder: '如：东京成田', section: 'outbound' },
  { key: 'arrCode', label: '到达三字码', placeholder: '如：HAN', section: 'outbound' },
  { key: 'arrTime', label: '到达时间', placeholder: '如：01:10', section: 'outbound' },
  { key: 'arrDate', label: '到达日期', placeholder: '如：7/23', section: 'outbound' },
  { key: 'aircraft', label: '机型', placeholder: '如：空客 A320', section: 'outbound' },
  { key: 'duration', label: '飞行时长', placeholder: '如：2h5m', section: 'outbound' },
  { key: 'note', label: '备注', placeholder: '如：到达后 Grab 打车', section: 'outbound' },
  { key: 'airline', label: '航空公司', placeholder: '如：深圳航空', section: 'inbound' },
  { key: 'flightNo', label: '航班号', placeholder: '如：ZH106', section: 'inbound' },
  { key: 'depAirport', label: '出发机场', placeholder: '如：东京成田', section: 'inbound' },
  { key: 'depCode', label: '出发三字码', placeholder: '如：HAN', section: 'inbound' },
  { key: 'depTime', label: '出发时间', placeholder: '如：18:40', section: 'inbound' },
  { key: 'depDate', label: '出发日期', placeholder: '如：7/26', section: 'inbound' },
  { key: 'arrAirport', label: '到达机场', placeholder: '如：深圳宝安', section: 'inbound' },
  { key: 'arrCode', label: '到达三字码', placeholder: '如：SZX', section: 'inbound' },
  { key: 'arrTime', label: '到达时间', placeholder: '如：21:30', section: 'inbound' },
  { key: 'arrDate', label: '到达日期', placeholder: '如：7/26', section: 'inbound' },
  { key: 'aircraft', label: '机型', placeholder: '如：空客 A320', section: 'inbound' },
  { key: 'duration', label: '飞行时长', placeholder: '如：1h50m', section: 'inbound' },
  { key: 'note', label: '备注', placeholder: '如：到家约 22:30', section: 'inbound' }
];

const HOTEL_FIELDS = [
  { key: 'name', label: '酒店名称', placeholder: '如：东京王子酒店' },
  { key: 'address', label: '地址', placeholder: '如：東京都港区芝公園4-2-8' },
  { key: 'tags', label: '标签', placeholder: '如：2024年新开, 4星, 中庭花园' },
  { key: 'roomType', label: '房型', placeholder: '如：Superior Twin Room' },
  { key: 'checkIn', label: '入住时间', placeholder: '如：7/23 凌晨 2:00' },
  { key: 'checkOut', label: '退房时间', placeholder: '如：7/26 12:00' }
];

Page({
  data: {
    isEdit: false,
    tripId: '',
    docId: '',
    loading: false,
    saving: false,
    openSection: 'basic',
    form: emptyForm(),
    themes: THEMES,
    flightFields: FLIGHT_FIELDS,
    hotelFields: HOTEL_FIELDS,
    sectionState: {
      basic: false,
      flights: false,
      hotel: false,
      budget: false
    }
  },

  onLoad(options) {
    const { tripId } = options;

    if (tripId) {
      this.setData({ isEdit: true, tripId });
      this.loadExistingTrip(tripId);
    } else {
      this.updateSectionStates();
    }
  },

  // ═══ 加载已有旅行数据 ═══
  async loadExistingTrip(tripId) {
    this.setData({ loading: true });
    try {
      const trip = await api.getMyTrip(tripId);
      if (trip) {
        // 深合并到空表单上（保证所有字段存在）
        const form = emptyForm();
        this.deepMerge(form, trip);
        this.setData({ form, docId: trip._id, loading: false });
        this.updateSectionStates();
      }
    } catch (err) {
      console.error('加载旅行数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
      this.setData({ loading: false });
    }
  },

  deepMerge(target, source) {
    for (const key of Object.keys(target)) {
      if (source[key] !== undefined && source[key] !== null) {
        if (typeof target[key] === 'object' && !Array.isArray(target[key])) {
          this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  },

  // ═══ 分段展开/收起 ═══
  onToggleSection(e) {
    const key = e.currentTarget.dataset.key;
    const current = this.data.openSection;
    this.setData({ openSection: current === key ? '' : key });
  },

  // ═══ 通用字段输入 ═══
  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
    this.updateSectionStates();
  },

  onMetaInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.meta.${field}`]: value });
  },

  onFlightInput(e) {
    const section = e.currentTarget.dataset.section;
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.flights.${section}.${field}`]: value,
      'form.flights.enabled': true
    });
    this.updateSectionStates();
  },

  onHotelInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.hotel.${field}`]: value });
    this.updateSectionStates();
  },

  onBudgetInput(e) {
    const val = parseFloat(e.detail.value) || 0;
    this.setData({ 'form.budget.totalBudget': val });
    this.updateSectionStates();
  },

  // ═══ 日期选择 ═══
  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.meta.${field}`]: value });
    this.updateSectionStates();
  },

  // ═══ 主题选择 ═══
  onSelectTheme(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'form.theme': value });
  },

  // ═══ 更新各段完成状态 ═══
  updateSectionStates() {
    const f = this.data.form;
    const states = {
      basic: !!(f.title && f.meta.startDate),
      flights: !!(f.flights.outbound && f.flights.outbound.flightNo ||
                  f.flights.inbound && f.flights.inbound.flightNo),
      hotel: !!(f.hotel && f.hotel.name),
      budget: !!(f.budget && f.budget.totalBudget > 0)
    };
    this.setData({ sectionState: states });
  },

  // ═══ 保存 ═══
  async onSave() {
    const { form, isEdit, docId } = this.data;

    // 验证必填
    if (!form.title || !form.title.trim()) {
      wx.showToast({ title: '请输入旅行标题', icon: 'none' });
      return;
    }
    if (!form.meta.startDate) {
      wx.showToast({ title: '请选择出发日期', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    try {
      // 清理数据：只保留有值的字段
      const tripData = this.cleanFormData(form);

      if (isEdit) {
        await api.updateTrip(docId, tripData);
        wx.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      } else {
        tripData.tripId = uuid();
        tripData.isPublic = false;
        const result = await api.createTrip(tripData);
        wx.showToast({ title: '创建成功！', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/trip/detail/index?tripId=${tripData.tripId}`
          });
        }, 1000);
      }
    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      this.setData({ saving: false });
    }
  },

  cleanFormData(form) {
    // 深拷贝并清理空字符串
    const cleaned = JSON.parse(JSON.stringify(form));

    // 清理航班：如果两程都没有航班号，则 disable
    const hasOut = cleaned.flights.outbound && cleaned.flights.outbound.flightNo;
    const hasIn = cleaned.flights.inbound && cleaned.flights.inbound.flightNo;
    cleaned.flights.enabled = !!(hasOut || hasIn);

    return cleaned;
  },

  // ═══ 删除 ═══
  onDelete() {
    const { form } = this.data;
    wx.showModal({
      title: '删除旅行',
      content: `确定要删除「${form.title}」吗？不可恢复。`,
      confirmText: '删除',
      confirmColor: '#DC2626',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteTrip(this.data.docId);
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1000);
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'error' });
          }
        }
      }
    });
  }
});
