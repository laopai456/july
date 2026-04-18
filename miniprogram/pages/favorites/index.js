const userStore = require('../../utils/userStore.js')

Page({
  data: {
    list: [],
    loading: true,
    showActionMenu: false,
    actionMenuItem: null
  },

  onLoad() {
    this.loadFavorites()
  },

  onShow() {
    this.loadFavorites()
  },

  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  },

  loadFavorites() {
    const list = userStore.getFavorites()
    this.setData({ list, loading: false })
  },

  onItemLongPress(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    if (!item) return
    this.setData({ showActionMenu: true, actionMenuItem: item })
  },

  hideActionMenu() {
    this.setData({ showActionMenu: false, actionMenuItem: null })
  },

  onMarkWatched() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.markWatched(item)
    this.hideActionMenu()
    this.loadFavorites()
    wx.showToast({ title: '已标记为看过', icon: 'success' })
  },

  onRemoveFavorite() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.removeFavorite(item.doubanId)
    this.hideActionMenu()
    this.loadFavorites()
    wx.showToast({ title: '已移除', icon: 'success' })
  },

  showDetail(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    if (!item) return
    wx.showToast({ title: '详情功能开发中', icon: 'none' })
  },

  preventBubble() {}
})
