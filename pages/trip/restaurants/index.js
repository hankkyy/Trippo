// ═══════════════════════════════════════════════
// 餐厅编辑器 — 添加/编辑/删除餐厅
// ═══════════════════════════════════════════════

var api = require('../../../utils/api');

var TAG_OPTIONS = [
  { label: '米其林', value: 'mich' },
  { label: 'Bib Gourmand', value: 'bib' },
  { label: '本地推荐', value: 'local' }
];

// 构建带 active 状态的标签列表（WXML 不支持 .indexOf()）
function buildTagOptions(selectedTags) {
  var tags = selectedTags || [];
  return TAG_OPTIONS.map(function(t) {
    var active = false;
    for (var i = 0; i < tags.length; i++) {
      if (tags[i] === t.label) { active = true; break; }
    }
    return { label: t.label, value: t.value, active: active };
  });
}

Page({
  data: {
    tripId: '',
    trip: {},
    loading: true,
    error: false,
    errorMsg: '',
    restaurants: [],

    showForm: false,
    editingIndex: -1,
    formName: '',
    formEmoji: '🍽️',
    formAddress: '',
    formPrice: '',
    formTags: [],
    formDesc: '',
    formRecommend: '',
    formMapUrl: '',
    tagOptions: buildTagOptions([])
  },

  onLoad: function(options) {
    var tripId = options.tripId;
    if (!tripId) {
      this.setData({ loading: false, error: true, errorMsg: '缺少旅行 ID' });
      return;
    }
    this.setData({ tripId: tripId });
    this.loadTrip();
  },

  loadTrip: function() {
    var that = this;
    this.setData({ loading: true, error: false });
    api.getMyTrip(this.data.tripId).then(function(trip) {
      if (!trip) throw new Error('旅行不存在');
      that.processTrip(trip);
    }).catch(function(err) {
      console.error('加载失败:', err);
      that.setData({ loading: false, error: true, errorMsg: err.message || '加载失败' });
    });
  },

  processTrip: function(trip) {
    this.setData({
      loading: false,
      trip: trip,
      restaurants: trip.restaurants || []
    });
  },

  onShowForm: function(e) {
    var index = e.currentTarget.dataset.index;
    if (index !== undefined && index !== '' && index >= 0) {
      var r = this.data.restaurants[index];
      var tags = [];
      if (r.tags) {
        r.tags.forEach(function(t) {
          tags.push(typeof t === 'string' ? t : (t.label || ''));
        });
      }
      this.setData({
        showForm: true,
        editingIndex: index,
        formName: r.name || '',
        formEmoji: r.emoji || '🍽️',
        formAddress: r.address || '',
        formPrice: r.price || '',
        formTags: tags,
        formDesc: r.description || '',
        formRecommend: r.recommend || '',
        formMapUrl: r.mapUrl || '',
        tagOptions: buildTagOptions(tags)
      });
    } else {
      this.setData({
        showForm: true,
        editingIndex: -1,
        formName: '',
        formEmoji: '🍽️',
        formAddress: '',
        formPrice: '',
        formTags: [],
        formDesc: '',
        formRecommend: '',
        formMapUrl: '',
        tagOptions: buildTagOptions([])
      });
    }
  },

  onHideForm: function() {
    this.setData({ showForm: false, editingIndex: -1 });
  },

  onNameInput: function(e) { this.setData({ formName: e.detail.value }); },
  onEmojiInput: function(e) { this.setData({ formEmoji: e.detail.value }); },
  onAddressInput: function(e) { this.setData({ formAddress: e.detail.value }); },
  onPriceInput: function(e) { this.setData({ formPrice: e.detail.value }); },
  onDescInput: function(e) { this.setData({ formDesc: e.detail.value }); },
  onRecommendInput: function(e) { this.setData({ formRecommend: e.detail.value }); },
  onMapUrlInput: function(e) { this.setData({ formMapUrl: e.detail.value }); },

  onTagToggle: function(e) {
    var tagLabel = e.currentTarget.dataset.tag;
    var tags = this.data.formTags.slice(); // copy
    var idx = -1;
    for (var i = 0; i < tags.length; i++) {
      if (tags[i] === tagLabel) { idx = i; break; }
    }
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tagLabel);
    }
    this.setData({ formTags: tags, tagOptions: buildTagOptions(tags) });
  },

  onSave: function() {
    var that = this;
    var name = this.data.formName.trim();
    var emoji = this.data.formEmoji || '🍽️';
    var address = this.data.formAddress.trim();
    var price = this.data.formPrice.trim();
    var tagsRaw = this.data.formTags;
    var desc = this.data.formDesc.trim();
    var recommend = this.data.formRecommend.trim();
    var mapUrl = this.data.formMapUrl.trim();
    var editingIndex = this.data.editingIndex;

    if (!name) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }

    // 构建 tags 为标准结构
    var tags = tagsRaw.map(function(tagLabel) {
      var type = 'local';
      if (tagLabel === '米其林') type = 'mich';
      else if (tagLabel === 'Bib Gourmand') type = 'bib';
      return { label: tagLabel, type: type };
    });

    var newResto = {
      name: name,
      emoji: emoji,
      address: address,
      price: price,
      tags: tags,
      description: desc,
      recommend: recommend,
      mapUrl: mapUrl
    };

    var restaurants = this.data.restaurants.slice();
    if (editingIndex >= 0) {
      restaurants[editingIndex] = newResto;
    } else {
      restaurants.push(newResto);
    }

    api.updateTrip(this.data.trip._id, { restaurants: restaurants }).then(function() {
      var newTrip = JSON.parse(JSON.stringify(that.data.trip));
      newTrip.restaurants = restaurants;
      that.processTrip(newTrip);
      that.onHideForm();
      wx.showToast({ title: '已保存', icon: 'success' });
    }).catch(function() {
      wx.showToast({ title: '保存失败', icon: 'error' });
    });
  },

  onDelete: function(e) {
    var that = this;
    var index = e.currentTarget.dataset.index;
    var name = this.data.restaurants[index].name;

    wx.showModal({
      title: '确认删除？',
      content: '删除「' + name + '」后无法恢复',
      success: function(res) {
        if (!res.confirm) return;
        var restaurants = that.data.restaurants.filter(function(_, i) { return i !== index; });
        api.updateTrip(that.data.trip._id, { restaurants: restaurants }).then(function() {
          var newTrip = JSON.parse(JSON.stringify(that.data.trip));
          newTrip.restaurants = restaurants;
          that.processTrip(newTrip);
          wx.showToast({ title: '已删除', icon: 'success' });
        }).catch(function() {
          wx.showToast({ title: '删除失败', icon: 'error' });
        });
      }
    });
  }
});
