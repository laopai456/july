const userStore = require('../../utils/userStore.js')

const TABS = ['综艺', '电影', '热剧']

const SUB_CATEGORIES = {
  '电影': ['中国', '日韩', '欧美'],
  '热剧': ['韩剧', '日剧', '国产剧']
}

const CACHE_KEY = 'tmdb_cache'
const CACHE_EXPIRE = 30 * 60 * 1000

const DOUBAN_API = 'https://movie.douban.com/j'

Page({
  data: {
    tabs: TABS,
    currentTab: 0,
    currentTabName: '综艺',
    subCategories: [],
    currentSub: 0,
    currentSubName: '',
    list: [],
    loading: true,
    page: 1,
    hasMore: false,
    refreshAt: null,
    subCategoryCounts: [],
    showSearchBar: false,
    searchKeyword: '',
    isSearching: false,
    showDetailCard: false,
    detailItem: null,
    descExpanded: false,
    showActionMenu: false,
    actionMenuItem: null,
    actionMenuIndex: -1
  },

  _tabDataCache: {},
  _summaryCache: {},
  _scrollTop: 0,

  onLoad() {
    this._tabDataCache = {}
    this._summaryCache = {}
    this.loadDataWithPreload()
  },

  onPageScroll(e) {
    this._scrollTop = e.scrollTop
  },

  onPullDownRefresh() {
    this.clearCache()
    this._tabDataCache = {}
    this.loadDataWithPreload().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  clearCache() {
    try {
      wx.removeStorageSync(CACHE_KEY)
    } catch (e) {}
  },

  getCache(key, allowExpired) {
    try {
      const cache = wx.getStorageSync(CACHE_KEY) || {}
      const item = cache[key]
      if (!item) return null
      if (allowExpired || Date.now() - item.time < CACHE_EXPIRE) {
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

  async loadDataWithPreload() {
    const { currentTabName, currentSubName } = this.data
    this.setData({ loading: true })

    if (this._tabDataCache[currentTabName]) {
      this.applyTabData(currentTabName, currentSubName)
    } else {
      const freshCache = this.getCache(currentTabName)
      if (freshCache) {
        this._tabDataCache[currentTabName] = freshCache
        this.applyTabData(currentTabName, currentSubName)
      } else {
        const expiredCache = this.getCache(currentTabName, true)
        if (expiredCache) {
          this._tabDataCache[currentTabName] = expiredCache
          this.applyTabData(currentTabName, currentSubName)
        }
        this.loadTabFromNetwork(currentTabName)
      }
    }

    const preloadTabs = TABS.filter(t => t !== currentTabName)
    for (const tab of preloadTabs) {
      if (!this._tabDataCache[tab]) {
        this.loadTabFromNetwork(tab)
      }
    }
  },

  async loadTabFromNetwork(tabName) {
    try {
      let data
      if (tabName === '综艺') {
        data = await this.fetchVarietyAll()
      } else if (tabName === '电影') {
        data = await this.fetchMovieAll()
      } else if (tabName === '热剧') {
        data = await this.fetchDramaAll()
      }

      if (data) {
        this._tabDataCache[tabName] = data
        this.setCache(tabName, data)

        if (this.data.currentTabName === tabName) {
          this.applyTabData(tabName, this.data.currentSubName)
        }
      }
    } catch (err) {
      console.error(`预加载 ${tabName} 失败:`, err)
    }
  },

  applyTabData(tabName, subName) {
    const data = this._tabDataCache[tabName]
    if (!data) return

    if (tabName === '综艺') {
      const rawList = Array.isArray(data) ? data : (data.items || [])
      const currentMonth = new Date().getMonth() + 1
      const filtered = rawList.filter(item => !item.airMonth || item.airMonth <= currentMonth)
      const list = userStore.filterWatched(filtered).slice(0, 50)
      this.setData({
        list,
        hasMore: false,
        loading: false,
        refreshAt: '云存储数据'
      })
    } else {
      const rawList = (data.items[subName] || [])
      const list = userStore.filterWatched(rawList).slice(0, 30)
      const subs = SUB_CATEGORIES[tabName]
      this.setData({
        list,
        subCategoryCounts: subs.map(s => (data.items[s] || []).length),
        hasMore: false,
        loading: false,
        refreshAt: '云存储数据'
      })
    }
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    const tabName = TABS[index]
    const subs = SUB_CATEGORIES[tabName] || []
    this.setData({
      currentTab: index,
      currentTabName: tabName,
      subCategories: subs,
      currentSub: 0,
      currentSubName: subs[0] || '',
      list: [],
      loading: true,
      subCategoryCounts: subs.map(() => 0)
    })

    if (this._tabDataCache[tabName]) {
      this.applyTabData(tabName, subs[0] || '')
    } else {
      this.loadTabFromNetwork(tabName)
    }

    const preloadTabs = TABS.filter(t => t !== tabName)
    for (const tab of preloadTabs) {
      if (!this._tabDataCache[tab]) {
        this.loadTabFromNetwork(tab)
      }
    }
  },

  onSubChange(e) {
    const index = e.currentTarget.dataset.index
    const subs = SUB_CATEGORIES[this.data.currentTabName]
    if (!subs) return
    const subName = subs[index]

    this.setData({
      currentSub: index,
      currentSubName: subName,
      list: [],
      loading: true
    })

    if (this._tabDataCache[this.data.currentTabName]) {
      this.applyTabData(this.data.currentTabName, subName)
      return
    }

    this.loadData()
  },

  async loadData() {
    const { currentTabName, currentSubName } = this.data

    this.setData({ loading: true })

    const cacheKey = `${currentTabName}_${currentSubName}`
    const cached = this.getCache(cacheKey)

    if (cached && cached.length > 0) {
      const cleanedList = cached.map(item => ({
        ...item,
        poster: (item.poster || '').replace(/[\s`'"''""]/g, '').trim(),
        castDisplay: item.castDisplay || (item.cast && item.cast.length > 0 ? item.cast.slice(0, 3).join(' / ') : '')
      }))
      this.setData({
        list: userStore.filterWatched(cleanedList),
        hasMore: false,
        loading: false,
        refreshAt: '缓存数据'
      })
      return
    }

    try {
      let list = []

      if (currentTabName === '综艺') {
        list = await this.loadVariety()
      } else if (currentTabName === '电影') {
        list = await this.loadMovie(currentSubName)
      } else if (currentTabName === '热剧') {
        list = await this.loadDrama(currentSubName)
      }

      if (list.length > 0) {
        this.setCache(cacheKey, list)
      }

      this.setData({
        list: userStore.filterWatched(list),
        hasMore: false,
        loading: false,
        refreshAt: '云存储数据'
      })

    } catch (err) {
      console.error('获取失败:', err)
      this.setData({
        list: [],
        loading: false,
        hasMore: false,
        refreshAt: '加载失败: ' + (err.message || '未知错误')
      })
    }
  },

  async callDataService(action, params) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dataService',
        data: { action, ...params }
      })
      return res.result
    } catch (cloudErr) {
      console.warn('云函数失败，尝试直连:', cloudErr.message)
      return await this.fetchDirect(action, params)
    }
  },

  async fetchDirect(action, params) {
    const config = require('../../utils/config.js')
    let url = ''
    if (action === 'getVariety') {
      url = config.apiBase + '/api/variety'
    } else if (action === 'getMovie') {
      url = config.apiBase + '/api/movie/' + (params.type || 'chinese')
    } else if (action === 'getDrama') {
      url = config.apiBase + '/api/drama/' + (params.type || 'korean')
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'GET',
        timeout: 15000,
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            resolve(res.data)
          } else {
            reject(new Error('HTTP ' + res.statusCode))
          }
        },
        fail: (err) => reject(err)
      })
    })
  },

  async fetchVarietyAll() {
    try {
      const result = await this.callDataService('getVariety', {})
      if (!result || !result.subjects) return null

      const allItems = []
      for (const item of result.subjects) {
        if (allItems.some(i => i.doubanId === item.id)) continue

        allItems.push({
          doubanId: item.doubanId || item.id,
          title: item.title,
          titleEn: '',
          type: 'variety',
          mainCategory: '综艺',
          region: 'cn',
          year: item.year ? parseInt(item.year) : 0,
          genres: item.genres || [],
          poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
          rating: parseFloat(item.rate) || 0,
          hotScore: item.hotScore || 0,
          airMonth: item.airMonth || 0,
          ratingSource: 'douban',
          description: item.summary || '',
          cast: item.casts || [],
          castDisplay: (item.casts || []).slice(0, 3).join(' / '),
          director: (item.directors || []).join(' / '),
          status: 'ongoing',
          viewCount: 0,
          rank: allItems.length + 1
        })
      }

      const currentMonth = new Date().getMonth() + 1
      return allItems
        .filter(item => !item.airMonth || item.airMonth <= currentMonth)
        .sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
    } catch (err) {
      console.error('fetchVarietyAll error:', err)
      return null
    }
  },

  async fetchMovieAll() {
    try {
      const typeMap = { '中国': 'chinese', '日韩': 'asia', '欧美': 'western' }
      const subs = SUB_CATEGORIES['电影']

      const promises = subs.map(sub =>
        this.callDataService('getMovie', { type: typeMap[sub] }).catch(() => null)
      )
      const results = await Promise.all(promises)

      const items = {}
      subs.forEach((sub, idx) => {
        const result = results[idx]
        if (!result || !result.subjects) {
          items[sub] = []
          return
        }
        items[sub] = result.subjects.map((item, index) => ({
          doubanId: item.doubanId || item.id,
          title: item.title,
          titleEn: '',
          type: 'movie',
          mainCategory: '电影',
          subCategory: sub,
          region: 'cn',
          year: item.year ? parseInt(item.year) : 0,
          genres: item.genres || [],
          poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
          rating: parseFloat(item.rate) || 0,
          ratingSource: 'douban',
          description: item.summary || '',
          cast: item.casts || [],
          castDisplay: (item.casts || []).slice(0, 3).join(' / '),
          director: (item.directors || [])[0] || '',
          hotScore: item.hotScore || 0,
          status: 'released',
          viewCount: 0,
          rank: index + 1
        })).sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
      })

      return { items }
    } catch (err) {
      console.error('fetchMovieAll error:', err)
      return null
    }
  },

  async fetchDramaAll() {
    try {
      const typeMap = { '韩剧': 'korean', '日剧': 'japanese', '国产剧': 'chinese' }
      const regionMap = { '韩剧': 'kr', '日剧': 'jp', '国产剧': 'cn' }
      const subs = SUB_CATEGORIES['热剧']

      const promises = subs.map(sub =>
        this.callDataService('getDrama', { type: typeMap[sub] }).catch(() => null)
      )
      const results = await Promise.all(promises)

      const items = {}
      subs.forEach((sub, idx) => {
        const result = results[idx]
        if (!result || !result.subjects) {
          items[sub] = []
          return
        }
        items[sub] = result.subjects.map((item, index) => ({
          doubanId: item.doubanId || item.id,
          title: item.title,
          titleEn: '',
          type: 'drama',
          mainCategory: '热剧',
          subCategory: sub,
          region: regionMap[sub] || 'cn',
          year: item.year ? parseInt(item.year) : 0,
          genres: item.genres || [],
          poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
          rating: parseFloat(item.rate) || 0,
          ratingSource: 'douban',
          description: item.summary || '',
          cast: item.casts || [],
          castDisplay: (item.casts || []).slice(0, 3).join(' / '),
          director: (item.directors || [])[0] || '',
          hotScore: item.hotScore || 0,
          status: 'ongoing',
          viewCount: 0,
          rank: index + 1
        })).sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
      })

      return { items }
    } catch (err) {
      console.error('fetchDramaAll error:', err)
      return null
    }
  },

  async loadVariety() {
    try {
      const result = await this.callDataService('getVariety', {})

      if (!result || !result.subjects) return []

      const allItems = []
      for (const item of result.subjects) {
        if (allItems.some(i => i.doubanId === item.id)) continue

        allItems.push({
          doubanId: item.doubanId || item.id,
          title: item.title,
          titleEn: '',
          type: 'variety',
          mainCategory: '综艺',
          region: 'cn',
          year: item.year ? parseInt(item.year) : 0,
          genres: item.genres || [],
          poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
          rating: parseFloat(item.rate) || 0,
          hotScore: item.hotScore || 0,
          airMonth: item.airMonth || 0,
          ratingSource: 'douban',
          description: item.summary || '',
          cast: item.casts || [],
          castDisplay: (item.casts || []).slice(0, 3).join(' / '),
          director: (item.directors || []).join(' / '),
          status: 'ongoing',
          viewCount: 0,
          rank: allItems.length + 1
        })
      }

      const currentMonth = new Date().getMonth() + 1
      return allItems
        .filter(item => !item.airMonth || item.airMonth <= currentMonth)
        .sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0)).slice(0, 50)
    } catch (err) {
      console.error('loadVariety error:', err)
      return []
    }
  },

  async loadMovie(subCategory) {
    try {
      const typeMap = {
        '中国': 'chinese',
        '日韩': 'asia',
        '欧美': 'western'
      }

      const result = await this.callDataService('getMovie', { type: typeMap[subCategory] || 'chinese' })

      if (!result || !result.subjects) return []

      const allItems = result.subjects.map((item, index) => ({
        doubanId: item.doubanId || item.id,
        title: item.title,
        titleEn: '',
        type: 'movie',
        mainCategory: '电影',
        subCategory: subCategory,
        region: 'cn',
        year: item.year ? parseInt(item.year) : 0,
        genres: item.genres || [],
        poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
        rating: parseFloat(item.rate) || 0,
        ratingSource: 'douban',
        description: item.summary || '',
        cast: item.casts || [],
        castDisplay: (item.casts || []).slice(0, 3).join(' / '),
        director: (item.directors || [])[0] || '',
        hotScore: item.hotScore || 0,
        status: 'released',
        viewCount: 0,
        rank: index + 1
      }))

      allItems.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
      return allItems.slice(0, 30)
    } catch (err) {
      console.error('loadMovie error:', err)
      return []
    }
  },

  async loadDrama(subCategory) {
    try {
      const typeMap = {
        '韩剧': 'korean',
        '日剧': 'japanese',
        '国产剧': 'chinese'
      }

      const result = await this.callDataService('getDrama', { type: typeMap[subCategory] || 'korean' })

      if (!result || !result.subjects) return []

      const regionMap = { '韩剧': 'kr', '日剧': 'jp', '国产剧': 'cn' }

      const allItems = result.subjects.map((item, index) => ({
        doubanId: item.doubanId || item.id,
        title: item.title,
        titleEn: '',
        type: 'drama',
        mainCategory: '热剧',
        subCategory: subCategory,
        region: regionMap[subCategory] || 'cn',
        year: item.year ? parseInt(item.year) : 0,
        genres: item.genres || [],
        poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
        rating: parseFloat(item.rate) || 0,
        ratingSource: 'douban',
        description: item.summary || '',
        cast: item.casts || [],
        castDisplay: (item.casts || []).slice(0, 3).join(' / '),
        director: (item.directors || [])[0] || '',
        hotScore: item.hotScore || 0,
        status: 'ongoing',
        viewCount: 0,
        rank: index + 1
      }))

      allItems.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
      const filtered = allItems.slice(0, 30)

      const countIndex = { '韩剧': 0, '日剧': 1, '国产剧': 2 }[subCategory] || 0
      const counts = [0, 0, 0]
      counts[countIndex] = filtered.length
      this.setData({ subCategoryCounts: counts })

      return filtered
    } catch (err) {
      console.error('loadDrama error:', err)
      return []
    }
  },

  async fetchTMDB(url) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  onPosterError(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    console.error('图片加载失败:', item?.title, 'URL:', item?.poster?.substring(0, 60))
  },

  showDetail(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    if (!item) return

    const cacheKey = item.doubanId || item.title
    const cachedSummary = this._summaryCache[cacheKey]
    const finalDesc = (cachedSummary && cachedSummary.length > (item.description || '').length)
      ? cachedSummary
      : item.description

    this.setData({
      showDetailCard: true,
      detailItem: {
        ...item,
        description: finalDesc || '暂无简介'
      },
      descExpanded: false
    })

    if (!item.description || item.description.length < 300) {
      if (!cachedSummary) {
        this.fetchFullSummary(item)
      }
    }
  },

  async fetchFullSummary(item) {
    try {
      const identifier = item.doubanId || item.title
      if (!identifier) return

      let result
      try {
        const res = await wx.cloud.callFunction({
          name: 'dataService',
          data: { action: 'getSubject', id: String(identifier) }
        })
        result = res.result
      } catch (e) {
        const config = require('../../utils/config.js')
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: config.apiBase + '/api/subject/' + encodeURIComponent(String(identifier)),
            method: 'GET',
            timeout: 8000,
            success: r => resolve(r.data),
            fail: reject
          })
        })
        result = res
      }

      if (result && result.summary && result.summary.length > (item.description || '').length) {
        const cacheKey = item.doubanId || item.title
        this._summaryCache[cacheKey] = result.summary
        const idx = this.data.list.findIndex(i => (i.doubanId || i.title) === cacheKey)
        if (idx > -1) {
          this.setData({
            [`list[${idx}].description`]: result.summary,
            'detailItem.description': result.summary
          })
        }
      }
    } catch (err) {
      console.error('获取完整简介失败:', err)
    }
  },

  toggleDesc() {
    this.setData({
      descExpanded: !this.data.descExpanded
    })
  },

  hideDetail() {
    this.setData({
      showDetailCard: false,
      detailItem: null
    })
  },

  onItemLongPress(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    if (!item) return
    this.setData({
      showActionMenu: true,
      actionMenuItem: item,
      actionMenuIndex: index
    })
  },

  hideActionMenu() {
    this.setData({ showActionMenu: false, actionMenuItem: null, actionMenuIndex: -1 })
  },

  onMarkWatched() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.markWatched(item)
    this.hideActionMenu()
    this.applyTabData(this.data.currentTabName, this.data.currentSubName)
    wx.showToast({ title: '已标记为看过', icon: 'success' })
  },

  onAddFavorite() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.addFavorite(item)
    this.hideActionMenu()
    wx.showToast({ title: '已收藏', icon: 'success' })
  },

  preventBubble() {},

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    const { list } = this.data
    const item = list.find(i => i.doubanId === id || i._id === id)

    if (item) {
      wx.setStorageSync('currentDetail', item)
      wx.navigateTo({
        url: `/pages/detail/index?id=${id}&from=${item.ratingSource || 'tmdb'}`
      })
    }
  },

  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/index'
    })
  },

  goToGenre() {
    wx.navigateTo({
      url: '/pages/genre/index'
    })
  },

  goToFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/index'
    })
  },

  goTowatched() {
    wx.navigateTo({
      url: '/pages/watched/index'
    })
  },

  toggleSearchBar() {
    this.setData({
      showSearchBar: !this.data.showSearchBar,
      searchKeyword: '',
      isSearching: false
    })
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  async onSearch() {
    const { searchKeyword } = this.data
    if (!searchKeyword.trim()) return

    this.setData({ isSearching: true, loading: true })

    try {
      const url = `${DOUBAN_API}/search_subjects?type=&tag=${encodeURIComponent(searchKeyword)}&sort=relevance&page_limit=20&page_start=0`
      const result = await this.fetchTMDB(url)

      if (result && result.subjects) {
        const items = result.subjects.map((item, index) => ({
          doubanId: item.doubanId || item.id,
          title: item.title,
          titleEn: '',
          type: item.type === 'movie' ? 'movie' : 'drama',
          mainCategory: item.type === 'movie' ? '电影' : '热剧',
          subCategory: '',
          region: 'cn',
          year: item.year ? parseInt(item.year) : 0,
          genres: [],
          poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
          rating: parseFloat(item.rate) || 0,
          ratingSource: 'douban',
          description: '',
          cast: [],
          director: '',
          status: 'ongoing',
          viewCount: 0,
          rank: index + 1
        }))

        this.setData({
          list: items,
          loading: false,
          hasMore: false,
          refreshAt: `搜索结果: ${searchKeyword}`
        })
      }
    } catch (err) {
      console.error('搜索失败:', err)
      this.setData({
        list: [],
        loading: false
      })
    }
  },

  clearSearch() {
    this.setData({
      searchKeyword: '',
      isSearching: false,
      showSearchBar: false
    })
    this.loadData()
  }
})