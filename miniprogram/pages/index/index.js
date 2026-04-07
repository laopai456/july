const { movieApi } = require('../../utils/api')
const tmdb = require('../../utils/tmdb')

const TABS = ['综艺', '电影', '热剧']

const SUB_CATEGORIES = {
  '综艺': ['恋爱', '搞笑', '真人秀'],
  '电影': ['悬疑', '恋爱', '喜剧'],
  '热剧': ['韩剧', '日剧', '国产剧']
}

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000

Page({
  data: {
    tabs: TABS,
    currentTab: 0,
    currentTabName: '综艺',
    subCategories: SUB_CATEGORIES['综艺'],
    currentSub: 0,
    currentSubName: '恋爱',
    list: [],
    loading: true,
    page: 1,
    hasMore: false,
    refreshAt: null,
    refreshing: false
  },

  onLoad() {
    this.checkAndRefresh()
  },

  async checkAndRefresh() {
    const lastRefresh = wx.getStorageSync('lastRefreshTime') || 0
    const now = Date.now()
    
    if (now - lastRefresh > REFRESH_INTERVAL) {
      this.setData({ refreshing: true })
      try {
        await movieApi.batchRefreshAll()
        wx.setStorageSync('lastRefreshTime', now)
        console.log('榜单已自动刷新')
      } catch (err) {
        console.log('自动刷新失败:', err)
      }
      this.setData({ refreshing: false })
    }
    
    this.loadData()
  },

  onPullDownRefresh() {
    this.manualRefresh().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async manualRefresh() {
    this.setData({ list: [], loading: true, refreshing: true })
    
    try {
      await movieApi.batchRefreshAll()
      wx.setStorageSync('lastRefreshTime', Date.now())
      wx.showToast({ title: '榜单已更新', icon: 'success' })
    } catch (err) {
      console.log('刷新失败:', err)
    }
    
    this.setData({ refreshing: false })
    await this.loadData()
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    const tabName = TABS[index]
    this.setData({
      currentTab: index,
      currentTabName: tabName,
      subCategories: SUB_CATEGORIES[tabName],
      currentSub: 0,
      currentSubName: SUB_CATEGORIES[tabName][0],
      list: [],
      loading: true
    })
    this.loadData()
  },

  onSubChange(e) {
    const index = e.currentTarget.dataset.index
    const subName = SUB_CATEGORIES[this.data.currentTabName][index]
    this.setData({
      currentSub: index,
      currentSubName: subName,
      list: [],
      loading: true
    })
    this.loadData()
  },

  async resetAndLoad() {
    this.setData({ list: [], loading: true })
    await this.loadData()
  },

  async loadData() {
    const { currentTabName, currentSubName } = this.data
    
    this.setData({ loading: true })

    try {
      const result = await movieApi.getSubCategoryList({
        mainCategory: currentTabName,
        subCategory: currentSubName,
        pageSize: 30
      })

      const list = result.list || []
      
      this.setData({
        list,
        hasMore: false,
        loading: false,
        refreshAt: result.refreshAt
      })
      
      this.loadPosters(list)

    } catch (err) {
      if (err.errCode === -502005) {
        console.log('数据库正在初始化...')
        this.setData({ list: [], loading: false, hasMore: false })
      } else {
        console.error(err)
        this.setData({ loading: false })
      }
    }
  },

  async loadPosters(list) {
    const promises = list.map(async (item, i) => {
      if (!item.poster || !item.poster.includes('tmdb.org')) {
        const poster = await tmdb.getPoster(item)
        return { index: i, poster }
      }
      return null
    })
    
    const results = await Promise.all(promises)
    
    const updates = results.filter(r => r && r.poster)
    if (updates.length > 0) {
      const currentList = this.data.list
      updates.forEach(({ index, poster }) => {
        if (currentList[index]) {
          currentList[index].poster = poster
        }
      })
      this.setData({ list: currentList })
    }
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    })
  },

  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/index'
    })
  },

  onPosterError(e) {
    const { index } = e.currentTarget.dataset
    const list = this.data.list
    if (list[index]) {
      list[index].poster = ''
      this.setData({ list })
    }
  }
})
