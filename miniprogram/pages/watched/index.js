const userStore = require('../../utils/userStore.js')

Page({
  data: {
    list: [],
    loading: true,
    showActionMenu: false,
    actionMenuItem: null
  },

  onLoad() {
    this.loadWatched()
  },

  onShow() {
    this.loadWatched()
  },

  onPullDownRefresh() {
    this.loadWatched()
    wx.stopPullDownRefresh()
  },

  loadWatched() {
    const list = userStore.getWatched()
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

  onRemoveWatched() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.unmarkWatched(item.doubanId)
    this.hideActionMenu()
    this.loadWatched()
    wx.showToast({ title: '已恢复到榜单', icon: 'success' })
  },

  onAddFavorite() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.addFavorite(item)
    this.hideActionMenu()
    wx.showToast({ title: '已收藏', icon: 'success' })
  },

  preventBubble() {}
})
