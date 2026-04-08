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
    refreshing: false,
    subCategoryCounts: [0, 0, 0],
    showSearchBar: false,
    searchKeyword: '',
    isSearching: false
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
    
    this.loadSubCategoryCounts()
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
    this.loadSubCategoryCounts()
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
      loading: true,
      subCategoryCounts: [0, 0, 0]
    })
    this.loadSubCategoryCounts()
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

  async loadSubCategoryCounts() {
    const { currentTabName, subCategories } = this.data
    const db = wx.cloud.database()
    const counts = []
    
    for (const subCategory of subCategories) {
      try {
        const res = await db.collection('movies')
          .where({
            mainCategory: currentTabName,
            subCategory,
            year: db.command.gte(2020),
            isReserve: false
          })
          .count()
        console.log(`${currentTabName}-${subCategory}: ${res.total}`)
        counts.push(res.total)
      } catch (err) {
        console.error('查询失败:', err)
        counts.push(0)
      }
    }
    
    console.log('subCategoryCounts:', counts)
    this.setData({ subCategoryCounts: counts })
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
        refreshAt: this.formatRefreshTime(result.refreshAt)
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
  },

  formatRefreshTime(time) {
    if (!time) return ''
    
    const date = new Date(time)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    
    return `${month}月${day}日 ${hour}:${minute}`
  },

  onShareAppMessage() {
    const { currentTabName, currentSubName } = this.data
    return {
      title: `${currentTabName} · ${currentSubName} - 影视排行榜`,
      path: `/pages/index/index`
    }
  },

  onShareTimeline() {
    const { currentTabName, currentSubName } = this.data
    return {
      title: `${currentTabName} · ${currentSubName} - 影视排行榜`,
      query: ''
    }
  },

  showSearch() {
    this.setData({ showSearchBar: true })
  },

  hideSearch() {
    this.setData({ 
      showSearchBar: false, 
      searchKeyword: '',
      isSearching: false
    })
    this.loadData()
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearchConfirm() {
    const { searchKeyword } = this.data
    if (searchKeyword.trim()) {
      this.searchMovies(searchKeyword.trim())
    }
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
  },

  async searchMovies(keyword) {
    this.setData({ loading: true, isSearching: true })
    
    const db = wx.cloud.database()
    
    try {
      const res = await db.collection('movies')
        .where({
          title: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
        .orderBy('rating', 'desc')
        .limit(30)
        .get()
      
      this.setData({
        list: res.data,
        loading: false,
        hasMore: false
      })
    } catch (err) {
      console.error('搜索失败:', err)
      this.setData({ loading: false, list: [] })
    }
  }
})
