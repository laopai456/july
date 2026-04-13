const TABS = ['综艺', '电影', '热剧']

const SUB_CATEGORIES = {
  '综艺': ['真人秀', '喜剧', '音综'],
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
    subCategories: SUB_CATEGORIES['综艺'],
    currentSub: 0,
    currentSubName: '真人秀',
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
      const cleanedList = cached.map(item => ({
        ...item,
        poster: (item.poster || '').replace(/[\s`'"''""]/g, '').trim(),
        castDisplay: item.castDisplay || (item.cast && item.cast.length > 0 ? item.cast.slice(0, 3).join(' / ') : '')
      }))
      this.setData({
        list: cleanedList,
        hasMore: false,
        loading: false,
        refreshAt: '缓存数据'
      })
      return
    }

    try {
      let list = []

      if (currentTabName === '综艺') {
        list = await this.loadVariety(currentSubName)
      } else if (currentTabName === '电影') {
        list = await this.loadMovie(currentSubName)
      } else if (currentTabName === '热剧') {
        list = await this.loadDrama(currentSubName)
      }

      if (list.length > 0) {
        this.setCache(cacheKey, list)
      }

      this.setData({
        list,
        hasMore: false,
        loading: false,
        refreshAt: '云存储数据'
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

  async callDataService(action, params) {
    const res = await wx.cloud.callFunction({
      name: 'dataService',
      data: { action, ...params }
    })
    return res.result
  },

  getSubCategoryForVariety(title, genres) {
    const allText = title + ' ' + (genres || []).join(' ')

    const musicKeywords = ['音乐', '歌唱', '歌手', '唱歌', '声音', '好声音', '我是歌手', '超级女声', '快乐男声', '创造营', '青春有你', '偶像练习生', '乘风', '披荆斩棘', '舞蹈', '跳舞', '舞者', '街舞', '舞蹈风暴', '选秀', '偶像', '练习生', '出道', '成团', '蒙面唱', '蒙面歌王', '天赐的声音', '声入人心', '我们的歌', '时光音乐会', '乐队的夏天', '说唱', '明日之子', '创造101', '以团之名', '音综', '乐队']
    const comedyKeywords = ['喜剧', '搞笑', '脱口秀', '吐槽', '段子', '欢乐', '开心', '爆笑', '笑傲', '喜剧人', '喜剧大赛', '一年一度', '喜人', '欢乐喜剧']

    for (const keyword of musicKeywords) {
      if (allText.includes(keyword)) return '音综'
    }
    for (const keyword of comedyKeywords) {
      if (allText.includes(keyword)) return '喜剧'
    }
    return '真人秀'
  },

  async loadVariety(subCategory) {
    try {
      const result = await this.callDataService('getVariety', {})

      if (!result || !result.subjects) return []

      const allItems = []
      for (const item of result.subjects) {
        if (allItems.some(i => i.doubanId === item.id)) continue

        const subCat = item.subCategory || this.getSubCategoryForVariety(item.title, item.genres || [])

        allItems.push({
          doubanId: item.id,
          title: item.title,
          titleEn: '',
          type: 'variety',
          mainCategory: '综艺',
          subCategory: subCat,
          region: 'cn',
          year: item.year ? parseInt(item.year) : 0,
          genres: item.genres || [],
          poster: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
          rating: parseFloat(item.rate) || 0,
          hotScore: item.hotScore || 0,
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

      const showItems = allItems.filter(i => i.subCategory === '真人秀').sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
      const comedyItems = allItems.filter(i => i.subCategory === '喜剧').sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
      const musicItems = allItems.filter(i => i.subCategory === '音综').sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))

      const counts = {
        '真人秀': showItems.length,
        '喜剧': comedyItems.length,
        '音综': musicItems.length
      }

      this.setData({ subCategoryCounts: [counts['真人秀'] || 0, counts['喜剧'] || 0, counts['音综'] || 0] })

      let filteredItems = []
      if (subCategory === '真人秀') {
        filteredItems = showItems
      } else if (subCategory === '喜剧') {
        filteredItems = comedyItems
      } else if (subCategory === '音综') {
        filteredItems = musicItems
      }

      return filteredItems.slice(0, 30)
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
        doubanId: item.id,
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
        doubanId: item.id,
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
          doubanId: item.id,
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
