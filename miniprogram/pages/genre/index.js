const userStore = require('../../utils/userStore.js')

const GENRE_LIST = ['悬疑', '喜剧', '恐怖', '爱情']
const HIDDEN_TAG = '隐秘'
const HIDDEN_API_KEY = '情色'
const CACHE_KEY = 'genre_cache'
const CACHE_EXPIRE = 30 * 60 * 1000
const QUICK_LOAD_COUNT = 10

Page({
  data: {
    genreList: GENRE_LIST,
    currentGenre: '悬疑',
    currentSection: 'movie',
    list: [],
    loading: true,
    showDetailCard: false,
    detailItem: null,
    descExpanded: false,
    showActionMenu: false,
    actionMenuItem: null
  },

  _genreDataCache: {},
  _summaryCache: {},
  _fullLoadPending: null,
  _loveTapCount: 0,
  _loveTapTimer: null,
  _hiddenMode: false,

  onLoad() {
    this._genreDataCache = {}
    this._summaryCache = {}
    this.loadGenreData()
  },

  onPullDownRefresh() {
    this._genreDataCache = {}
    this._fullLoadPending = null
    try { wx.removeStorageSync(CACHE_KEY) } catch (e) {}
    this.loadGenreData().then(() => wx.stopPullDownRefresh())
  },

  onUnload() {
    this._fullLoadPending = null
  },

  getCache(key) {
    try {
      const cache = wx.getStorageSync(CACHE_KEY) || {}
      const item = cache[key]
      if (item && Date.now() - item.time < CACHE_EXPIRE) return item.data
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

  onGenreChange(e) {
    const genre = e.currentTarget.dataset.genre

    if (genre === '爱情' && !this._hiddenMode) {
      clearTimeout(this._loveTapTimer)
      this._loveTapCount++
      if (this._loveTapCount >= 5) {
        this._loveTapCount = 0
        this._hiddenMode = true
        this._fullLoadPending = null
        this.setData({
          genreList: [...GENRE_LIST, HIDDEN_TAG],
          currentGenre: HIDDEN_TAG,
          list: [],
          loading: true
        })
        this.loadGenreData()
        return
      }
      this._loveTapTimer = setTimeout(() => { this._loveTapCount = 0 }, 2000)
    }

    if (genre === this.data.currentGenre) return

    this._fullLoadPending = null
    this.setData({
      currentGenre: genre,
      list: [],
      loading: true
    })
    this.loadGenreData()
  },

  onSectionChange(e) {
    const section = e.currentTarget.dataset.section
    if (section === this.data.currentSection) return

    this.setData({
      currentSection: section,
      loading: true
    })
    this.applySectionData()
  },

  async loadGenreData() {
    const { currentGenre } = this.data
    const cacheKey = currentGenre === HIDDEN_TAG ? HIDDEN_API_KEY : currentGenre

    if (this._genreDataCache[cacheKey]) {
      this.applySectionData()
      return
    }

    const diskCache = this.getCache(cacheKey)
    if (diskCache) {
      this._genreDataCache[cacheKey] = diskCache
      this.applySectionData()
      return
    }

    await this.quickLoad(cacheKey)
  },

  async quickLoad(cacheKey) {
    try {
      const result = await this.callDataService('getGenre', { name: cacheKey, limit: QUICK_LOAD_COUNT })
      if (!result) {
        this.setData({ loading: false, list: [] })
        return
      }

      const processed = this.processGenreResult(result)
      this._genreDataCache[cacheKey] = processed
      this.applySectionData()
      this.fullLoad(cacheKey)
    } catch (err) {
      console.error('快速加载失败:', err)
      this.setData({ loading: false, list: [] })
    }
  },

  async fullLoad(cacheKey) {
    if (this._fullLoadPending === cacheKey) return
    this._fullLoadPending = cacheKey

    try {
      const result = await this.callDataService('getGenre', { name: cacheKey })
      if (!result || this._fullLoadPending !== cacheKey) return

      const processed = this.processGenreResult(result)

      const quickData = this._genreDataCache[cacheKey]
      const { currentSection } = this.data
      const quickList = quickData ? (quickData[currentSection] || []) : []
      const fullList = processed[currentSection] || []

      this._genreDataCache[cacheKey] = processed
      this.setCache(cacheKey, processed)

      if ((this.data.currentGenre === cacheKey || (this.data.currentGenre === HIDDEN_TAG && cacheKey === HIDDEN_API_KEY)) && fullList.length > quickList.length) {
        this.applySectionData()
      }
    } catch (err) {
      console.error('完整加载失败:', err)
    } finally {
      if (this._fullLoadPending === cacheKey) {
        this._fullLoadPending = null
      }
    }
  },

  processGenreResult(result) {
    const processSection = (items, type) => {
      if (!items) return []
      return items.map((item, index) => ({
        doubanId: item.doubanId || item.id,
        title: item.title,
        type: type,
        genres: item.genres || [],
        poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
        rating: parseFloat(item.rate) || 0,
        year: item.year || '',
        description: item.summary || item.abstract || '',
        cast: item.casts || [],
        castDisplay: (item.casts || []).slice(0, 3).join(' / '),
        director: (item.directors || [])[0] || '',
        hotScore: item.hotScore || 0,
        rank: index + 1
      })).sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
    }

    return {
      movie: processSection(result.movie || result.subjects, 'movie'),
      drama: processSection(result.drama || [], 'drama')
    }
  },

  applySectionData() {
    const { currentGenre, currentSection } = this.data
    const cacheKey = currentGenre === HIDDEN_TAG ? HIDDEN_API_KEY : currentGenre
    const data = this._genreDataCache[cacheKey]
    if (!data) return

    const rawList = (data[currentSection] || [])
    const list = userStore.filterWatched(rawList).slice(0, 50)
    this.setData({
      list,
      loading: false
    })
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
    if (action === 'getGenre') {
      let url = config.apiBase + '/api/genre/' + encodeURIComponent(params.name)
      if (params.limit) url += '?limit=' + params.limit
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
    }
    return null
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
    this.setData({ descExpanded: !this.data.descExpanded })
  },

  hideDetail() {
    this.setData({ showDetailCard: false, detailItem: null })
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
    this.applySectionData()
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

  onPosterError(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    console.error('图片加载失败:', item?.title)
  }
})