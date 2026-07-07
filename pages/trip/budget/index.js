// ═══════════════════════════════════════════════
// 记账本 — 多币种花费追踪
// ═══════════════════════════════════════════════

const api = require('../../../utils/api');
const { perPersonRMB } = require('../../../utils/format');

const CURRENCIES = ['CNY', 'USD', 'VND', 'EUR', 'JPY', 'KRW'];

// 汇率
const FX_TO_CNY = {
  CNY: 1,
  USD: 6.80,
  VND: 1 / 3880,
  EUR: 7.50,
  JPY: 0.048,
  KRW: 0.0052
};

const FX_SYMBOLS = {
  CNY: '¥', USD: '$', VND: '₫', EUR: '€', JPY: '¥', KRW: '₩'
};

// 格式化原始金额（在 JS 端预计算，不在 WXML 中调用方法）
function fmtOrig(amount, currency) {
  const sym = FX_SYMBOLS[currency] || '';
  if (currency === 'VND') {
    if (amount >= 1000) return Math.floor(amount / 1000) + 'k ' + sym;
    return amount + ' ' + sym;
  }
  if (currency === 'USD' || currency === 'EUR') {
    return sym + amount.toFixed(2);
  }
  return sym + Math.floor(amount);
}

// 计算人均 RMB
function calcPerPerson(item) {
  const rate = FX_TO_CNY[item.currency] || 1;
  const rmbTotal = item.amount * rate;
  if (item.splitType === 'perPerson') return rmbTotal;
  return rmbTotal / (item.people || 2);
}

Page({
  data: {
    tripId: '',
    trip: {},
    loading: true,
    error: false,
    errorMsg: '',

    expenses: [],
    totalBudget: 0,
    totalPerPerson: 0,
    budgetDiff: 0,
    budgetPct: 0,
    isOverBudget: false,

    showForm: false,
    editingIndex: -1,
    formDesc: '',
    formAmount: '',
    formCurrency: 'CNY',
    formSplitType: 'total',
    formPeople: 2,

    currencies: CURRENCIES,
    currencyIndex: 0,

    showDeleteConfirm: false,
    deleteIndex: -1
  },

  onLoad(options) {
    const tripId = options.tripId;
    if (!tripId) {
      this.setData({ loading: false, error: true, errorMsg: '缺少旅行 ID' });
      return;
    }
    this.setData({ tripId: tripId });
    this.loadTrip();
  },

  async loadTrip() {
    this.setData({ loading: true, error: false });
    try {
      const trip = await api.getMyTrip(this.data.tripId);
      if (!trip) throw new Error('旅行不存在');
      this.processTrip(trip);
    } catch (err) {
      console.error('加载失败:', err);
      this.setData({ loading: false, error: true, errorMsg: err.message || '加载失败' });
    }
  },

  processTrip(trip) {
    const rawExpenses = trip.expenses || [];
    const totalBudget = trip.budget && trip.budget.totalBudget
      ? Number(trip.budget.totalBudget)
      : 0;

    // 预计算每个花费的显示字符串（WXML 不支持 .toFixed()）
    let totalPerPerson = 0;
    const expenses = rawExpenses.map(function(e) {
      var ppRmb = calcPerPerson(e);
      totalPerPerson += ppRmb;
      return {
        desc: e.desc,
        amount: e.amount,
        currency: e.currency,
        splitType: e.splitType,
        people: e.people,
        createdAt: e.createdAt,
        // 预计算的显示字段
        displayAmount: fmtOrig(e.amount, e.currency),
        displaySplit: e.splitType === 'perPerson' ? '人均' : ('共' + (e.people || 2) + '人'),
        displayRmb: '≈¥' + Math.floor(ppRmb) + '/人'
      };
    });

    var budgetDiff = totalBudget - totalPerPerson;
    var budgetPct = totalBudget > 0 ? Math.round((totalPerPerson / totalBudget) * 100) : 0;
    var isOverBudget = totalBudget > 0 && totalPerPerson > totalBudget;

    this.setData({
      loading: false,
      trip: trip,
      expenses: expenses,
      totalBudget: totalBudget,
      totalPerPerson: Math.floor(totalPerPerson),
      budgetDiff: Math.floor(Math.abs(budgetDiff)),
      budgetPct: budgetPct > 100 ? 100 : budgetPct,
      isOverBudget: isOverBudget,
      displayCurrencies: (trip.budget && trip.budget.currencies) ? trip.budget.currencies.join(' / ') : ''
    });
  },

  onShowForm(e) {
    var index = e.currentTarget.dataset.index;
    if (index !== undefined && index !== '' && index >= 0) {
      var rawExpenses = this.data.trip.expenses || [];
      var exp = rawExpenses[index];
      var ci = CURRENCIES.indexOf(exp.currency);
      this.setData({
        showForm: true,
        editingIndex: index,
        formDesc: exp.desc || '',
        formAmount: String(exp.amount || ''),
        formCurrency: exp.currency || 'CNY',
        currencyIndex: ci >= 0 ? ci : 0,
        formSplitType: exp.splitType || 'total',
        formPeople: exp.people || 2
      });
    } else {
      this.setData({
        showForm: true,
        editingIndex: -1,
        formDesc: '',
        formAmount: '',
        formCurrency: 'CNY',
        currencyIndex: 0,
        formSplitType: 'total',
        formPeople: 2
      });
    }
  },

  onHideForm: function() {
    this.setData({ showForm: false, editingIndex: -1 });
  },

  onDescInput: function(e) { this.setData({ formDesc: e.detail.value }); },
  onAmountInput: function(e) { this.setData({ formAmount: e.detail.value }); },

  onCurrencyChange: function(e) {
    var idx = e.detail.value;
    this.setData({ currencyIndex: idx, formCurrency: CURRENCIES[idx] });
  },

  onSplitTypeChange: function(e) {
    this.setData({ formSplitType: e.currentTarget.dataset.type });
  },

  onPeopleChange: function(e) {
    var val = parseInt(e.detail.value) || 1;
    if (val < 1) val = 1;
    if (val > 20) val = 20;
    this.setData({ formPeople: val });
  },

  async onSave() {
    var that = this;
    var desc = this.data.formDesc.trim();
    var amount = parseFloat(this.data.formAmount);
    var currency = this.data.formCurrency;
    var splitType = this.data.formSplitType;
    var people = this.data.formPeople;
    var editingIndex = this.data.editingIndex;

    if (!desc) {
      wx.showToast({ title: '请输入描述', icon: 'none' });
      return;
    }
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    var newExpense = {
      desc: desc,
      amount: amount,
      currency: currency,
      splitType: splitType,
      people: splitType === 'total' ? people : 1,
      createdAt: Date.now()
    };

    var rawExpenses = that.data.trip.expenses || [];
    if (editingIndex >= 0) {
      rawExpenses[editingIndex] = newExpense;
    } else {
      rawExpenses.push(newExpense);
    }

    try {
      await api.updateTrip(that.data.trip._id, { expenses: rawExpenses });
      var newTrip = JSON.parse(JSON.stringify(that.data.trip));
      newTrip.expenses = rawExpenses;
      that.processTrip(newTrip);
      that.onHideForm();
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'error' });
    }
  },

  onDeleteConfirm: function(e) {
    var index = e.currentTarget.dataset.index;
    this.setData({ showDeleteConfirm: true, deleteIndex: index });
  },

  onCancelDelete: function() {
    this.setData({ showDeleteConfirm: false, deleteIndex: -1 });
  },

  async onConfirmDelete() {
    var that = this;
    var deleteIndex = this.data.deleteIndex;
    var rawExpenses = (this.data.trip.expenses || []).filter(function(_, i) {
      return i !== deleteIndex;
    });

    try {
      await api.updateTrip(this.data.trip._id, { expenses: rawExpenses });
      var newTrip = JSON.parse(JSON.stringify(this.data.trip));
      newTrip.expenses = rawExpenses;
      that.processTrip(newTrip);
      that.setData({ showDeleteConfirm: false, deleteIndex: -1 });
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'error' });
    }
  }
});
