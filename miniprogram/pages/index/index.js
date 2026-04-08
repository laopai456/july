const tmdb = require('../../utils/tmdb')

const TABS = ['综艺', '电影', '热剧']

const SUB_CATEGORIES = {
  '综艺': ['恋爱', '搞笑', '真人秀'],
  '电影': ['热门', '高分', '最新'],
  '热剧': ['韩剧', '日剧', '国产剧']
}

const CACHE_KEY = 'tmdb_cache'
const CACHE_EXPIRE = 30 * 60 * 1000

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
    subCategoryCounts: [0, 0, 0],
    showSearchBar: false,
    searchKeyword: '',
    isSearching: false
  },

  onLoad() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.clearCache()
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  clearCache() {
    try {
      wx.removeStorageSync(CACHE_KEY)
    } catch (e) {}
  },

  getCache(key) {
    try {
      const cache = wx.getStorageSync(CACHE_KEY) || {}
      const item = cache[key]
      if (item && Date.now() - item.time < CACHE_EXPIRE) {
        return item.data
      }
    } catch (e) {}
    return null
  },

  setCache(key, data) {
    try {
      const cache = wx.getStorageSync(CACHE_KEY) || {}
      cache[key] = { data, time: Date.now() }
      wx.setStorageSync(CACHE_KEY, cache)
    } catch (e) {}
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

  async loadData() {
    const { currentTabName, currentSubName } = this.data
    
    this.setData({ loading: true })
    
    const cacheKey = `${currentTabName}_${currentSubName}`
    const cached = this.getCache(cacheKey)
    
    if (cached && cached.length > 0) {
      this.setData({
        list: cached,
        hasMore: false,
        loading: false,
        refreshAt: '缓存数据'
      })
      return
    }

    try {
      let list = []
      
      if (currentTabName === '综艺') {
        list = await this.loadVarietyFromDouban(currentSubName)
      } else if (currentTabName === '电影') {
        const movies = await tmdb.getPopularMovies(1) || []
        if (currentSubName === '热门') {
          list = movies.slice(0, 30)
        } else if (currentSubName === '高分') {
          list = movies.filter(m => m.rating >= 7.5).slice(0, 30)
        } else {
          list = movies.filter(m => m.year >= 2023).slice(0, 30)
        }
        this.setData({ subCategoryCounts: [movies.length, movies.filter(m => m.rating >= 7.5).length, movies.filter(m => m.year >= 2023).length] })
      } else if (currentTabName === '热剧') {
        const tvList = await tmdb.getPopularTV(1) || []
        const krList = tvList.filter(item => item.region === 'kr')
        const jpList = tvList.filter(item => item.region === 'jp')
        
        if (currentSubName === '韩剧') {
          list = krList.slice(0, 30)
          this.setData({ subCategoryCounts: [krList.length, jpList.length, 0] })
        } else if (currentSubName === '日剧') {
          list = jpList.slice(0, 30)
          this.setData({ subCategoryCounts: [krList.length, jpList.length, 0] })
        } else {
          const cnData = await this.loadCNDramaFromDouban()
          list = cnData.list
          this.setData({ subCategoryCounts: [krList.length, jpList.length, cnData.count] })
        }
      }
      
      if (list.length > 0) {
        this.setCache(cacheKey, list)
      }
      
      this.setData({
        list,
        hasMore: false,
        loading: false,
        refreshAt: currentTabName === '综艺' || (currentTabName === '热剧' && currentSubName === '国产剧') ? '实时获取自豆瓣' : '实时获取自TMDB'
      })
      
    } catch (err) {
      console.error('获取失败:', err)
      this.setData({
        list: [],
        loading: false,
        hasMore: false
      })
    }
  },

  async loadVarietyFromDouban(subCategory) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'douban',
        data: {
          action: 'getVariety',
          subCategory: subCategory,
          count: 50
        }
      })
      
      console.log('豆瓣综艺返回:', res.result)
      
      if (res.result?.code === 0 && res.result.data) {
        const counts = res.result.counts || { '恋爱': 0, '搞笑': 0, '真人秀': 0 }
        this.setData({ 
          subCategoryCounts: [counts['恋爱'], counts['搞笑'], counts['真人秀']]
        })
        
        return res.result.data.slice(0, 30)
      }
    } catch (err) {
      console.error('豆瓣获取失败:', err)
    }
    return []
  },

  async loadCNDramaFromDouban() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'douban',
        data: {
          action: 'getCNDrama',
          count: 50
        }
      })
      
      console.log('豆瓣国产剧返回:', res.result)
      
      if (res.result?.code === 0 && res.result.data) {
        return {
          list: res.result.data.slice(0, 30),
          count: res.result.data.length
        }
      }
    } catch (err) {
      console.error('豆瓣获取国产剧失败:', err)
    }
    return { list: [], count: 0 }
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    const { list } = this.data
    const item = list.find(i => i.tmdbId === id || i.doubanId === id || i._id === id)
    
    if (item) {
      wx.setStorageSync('currentDetail', item)
      wx.navigateTo({
        url: `/pages/detail/index?id=${id}&from=tmdb`
      })
    }
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
      this.searchTMDB(searchKeyword.trim())
    }
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
  },

  async searchTMDB(keyword) {
    this.setData({ loading: true, isSearching: true })
    
    try {
      const movies = await tmdb.searchPoster(keyword, 'movie')
      const tv = await tmdb.searchPoster(keyword, 'tv')
      
      const list = [
        ...(movies ? [{ ...movies, type: 'movie', mainCategory: '电影' }] : []),
        ...(tv ? [{ ...tv, type: 'drama', mainCategory: '热剧' }] : [])
      ]
      
      this.setData({
        list,
        loading: false,
        hasMore: false
      })
    } catch (err) {
      console.error('搜索失败:', err)
      this.setData({ loading: false, list: [] })
    }
  }
})
