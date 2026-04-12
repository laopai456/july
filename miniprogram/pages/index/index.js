const TABS = ['综艺', '电影', '热剧']

const SUB_CATEGORIES = {
  '综艺': ['真人秀', '喜剧', '音综'],
  '电影': ['中国', '日韩', '欧美'],
  '热剧': ['韩剧', '日剧', '国产剧']
}

const CACHE_KEY = 'tmdb_cache'
const CACHE_EXPIRE = 30 * 60 * 1000

const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const DOUBAN_API = 'https://movie.douban.com/j'

const LOVE_KEYWORDS = ['恋爱', '相亲', '心动', '约会', '情侣', '喜欢你', '心动的信号', '恋梦空间', '女儿们的恋爱', '我们恋爱吧', '喜欢你我也是', '机智的恋爱', '半熟恋人', '再见爱人', '怦然心动', '非诚勿扰', '新相亲', '中国新相亲', '爱情', '甜蜜', '结婚', '婚礼', '老公', '老婆', '男友', '女友', '桃花', '缘分', '告白', '求婚', '婚后', '幸福三重奏', '妻子的浪漫旅行']

const FUNNY_KEYWORDS = ['搞笑', '喜剧', '脱口秀', '吐槽', '段子', '吐槽大会', '脱口秀大会', '欢乐喜剧人', '笑傲江湖', '跨界喜剧王', '周六夜现场', '今夜百乐门', '喜剧总动员', '笑声传奇', '开心剧乐部', '超级笑星', '我为喜剧狂', '欢乐集结号', '快乐大本营', '天天向上', '王牌对王牌', '奔跑吧', '极限挑战', '向往的生活', '青春环游记', '元气满满的哥哥', '朋友请听好', '做家务的男人', '婆婆和妈妈', '我家小两口', '我家那闺女', '我家那小子', '开心', '欢乐', '爆笑', '逗', '乐', '综艺大热门', '综艺玩很大', '娱乐', '明星大侦探', '密室大逃脱', '大侦探', '推理', '剧本杀', '哈哈', '哈哈哈哈哈', '出发', '旅行', '游记', '探险', '冒险', '新鲜', '奇妙', '奇遇', '环游', '游历', '打卡', '探店', '美食', '吃货', '夜宵', '宵夜', '野餐', '露营', '帐篷', '房车', '公路', '自驾']

const SUSPENSE_KEYWORDS = ['悬疑', '犯罪', '惊悚', '推理', '破案', '侦探', '谜案', '消失', '误杀', '孤注一掷', '满江红', '漫长的季节', '隐秘的角落', '沉默的真相']

const ROMANCE_KEYWORDS = ['爱情', '恋爱', '浪漫', '初恋', '心动', '怦然', '喜欢你', '你的名字', '情书', '怦然心动', '爱乐之城', '去有风的地方', '繁花']

const COMEDY_KEYWORDS = ['喜剧', '搞笑', '幽默', '开心', '快乐', '爆笑', '年会不能停', '热辣滚烫', '飞驰人生', '抓娃娃', '一年一度喜剧大赛', '脱口秀大会']

const FOREIGN_VARIETY_KEYWORDS = ['韩国', '日本', '美国', '英国', 'Korean', 'Japanese', 'American', 'Running Man', '无限挑战', '我独自生活', '认识的哥哥', 'Happy Together', 'Radio Star', '音乐银行', '人气歌谣', 'M COUNTDOWN', '蒙面歌王', '我家的熊孩子', '同床异梦', '妻子的味道', '三时三餐', '尹食堂', '姜食堂', '两天一夜', '超人回来了', '人生酒馆', '黄金渔场', '白钟元', '林中小屋', '暑假', '露营', '地球娱乐室', '海妖的呼唤', 'The Zone', '犯罪现场', '女高推理', '魔鬼的计谋']

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
        list = await this.loadVarietyFromDouban(currentSubName)
      } else if (currentTabName === '电影') {
        list = await this.loadMovie(currentSubName)
      } else if (currentTabName === '热剧') {
        if (currentSubName === '韩剧') {
          list = await this.loadKDramaFromDouban()
        } else if (currentSubName === '日剧') {
          list = await this.loadJDramaFromDouban()
        } else {
          list = await this.loadCNDramaFromDouban()
        }
      }
      
      if (list.length > 0) {
        this.setCache(cacheKey, list)
      }
      
      this.setData({
        list,
        hasMore: false,
        loading: false,
        refreshAt: currentTabName === '电影' ? '实时获取自TMDB' : '实时获取自豆瓣'
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

  getRegion(item) {
    const originCountry = item.origin_country?.[0] || ''
    const originalLanguage = item.original_language || ''
    
    if (originCountry === 'KR' || originalLanguage === 'ko') return 'kr'
    if (originCountry === 'JP' || originalLanguage === 'ja') return 'jp'
    if (originCountry === 'CN' || originCountry === 'TW' || originalLanguage === 'zh') return 'cn'
    if (originCountry === 'US' || originCountry === 'GB' || originalLanguage === 'en') return 'us'
    
    return 'other'
  },

  getGenreName(id) {
    const genres = {
      28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
      99: '纪录', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
      27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
      10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部',
      10759: '动作冒险', 10762: '儿童', 10763: '新闻', 10764: '真人秀',
      10765: '科幻奇幻', 10766: '肥皂剧', 10767: '脱口秀', 10768: '战争政治'
    }
    return genres[id] || ''
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

  getSubCategoryForMovie(title, genres) {
    const allText = title + ' ' + (genres || []).join(' ')
    
    for (const keyword of SUSPENSE_KEYWORDS) {
      if (allText.includes(keyword)) return '悬疑'
    }
    for (const keyword of ROMANCE_KEYWORDS) {
      if (allText.includes(keyword)) return '恋爱'
    }
    for (const keyword of COMEDY_KEYWORDS) {
      if (allText.includes(keyword)) return '喜剧'
    }
    
    if (genres && genres.length > 0) {
      const firstGenre = genres[0]
      if (['悬疑', '犯罪', '惊悚'].includes(firstGenre)) return '悬疑'
      if (['爱情', '恋爱'].includes(firstGenre)) return '恋爱'
      if (['喜剧', '搞笑'].includes(firstGenre)) return '喜剧'
    }
    
    return '喜剧'
  },

  isForeignVariety(title) {
    for (const keyword of FOREIGN_VARIETY_KEYWORDS) {
      if (title.includes(keyword)) return true
    }
    return false
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

  async fetchDouban(tag, type, count = 50) {
    const tagTypeMap = {
      '综艺': 'variety',
      '韩剧': 'korean',
      '日剧': 'japanese',
      '国产剧': 'chinese'
    }
    
    const apiPath = tag === '综艺' ? '/api/variety' : `/api/drama/${tagTypeMap[tag]}`
    const config = require('../../utils/config.js')
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: config.apiBase + apiPath,
        method: 'GET',
        timeout: 15000,
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
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

  async loadVarietyFromDouban(subCategory) {
    try {
      const result = await this.fetchDouban('综艺', 'tv', 100)
      
      if (!result || !result.subjects) return []
      
      let allItems = []
      
      for (const item of result.subjects) {
        if (allItems.some(i => i.doubanId === item.id)) continue
        
        const subCat = item.subCategory || this.getSubCategoryForVariety(item.title, item.genres || [])
        
        const poster = (item.cover || '').replace(/[\s`'"''""]/g, '').trim()
        
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
          poster: poster,
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
      console.error('loadVarietyFromDouban error:', err)
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
      
      const result = await this.fetchMovieFromServer(typeMap[subCategory] || 'chinese')
      
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
      const filtered = allItems.slice(0, 30)
      
      return filtered
    } catch (err) {
      console.error('loadMovie error:', err)
      return []
    }
  },
  
  async fetchMovieFromServer(type) {
    return new Promise((resolve, reject) => {
      wx.cloud.callContainer({
        path: `/api/movie/${type}`,
        header: {
          "X-WX-SERVICE": "tcbanyservice",
          "X-AnyService-Name": "movieapi",
          "content-type": "application/json"
        },
        method: "GET",
        timeout: 15000,
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
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

  async loadKDramaFromDouban() {
    try {
      const result = await this.fetchDouban('韩剧', 'tv', 50)
      
      if (!result || !result.subjects) return []
      
      const allItems = result.subjects.map((item, index) => ({
        doubanId: item.id,
        title: item.title,
        titleEn: '',
        type: 'drama',
        mainCategory: '热剧',
        subCategory: '韩剧',
        region: 'kr',
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
      
      this.setData({ subCategoryCounts: [filtered.length, 0, 0] })
      
      return filtered
    } catch (err) {
      console.error('loadKDramaFromDouban error:', err)
      return []
    }
  },

  async loadJDramaFromDouban() {
    try {
      const result = await this.fetchDouban('日剧', 'tv', 50)
      
      if (!result || !result.subjects) return []
      
      const allItems = result.subjects.map((item, index) => ({
        doubanId: item.id,
        title: item.title,
        titleEn: '',
        type: 'drama',
        mainCategory: '热剧',
        subCategory: '日剧',
        region: 'jp',
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
      
      this.setData({ subCategoryCounts: [0, filtered.length, 0] })
      
      return filtered
    } catch (err) {
      console.error('loadJDramaFromDouban error:', err)
      return []
    }
  },

  async loadCNDramaFromDouban() {
    try {
      const result = await this.fetchDouban('国产剧', 'tv', 50)
      
      if (!result || !result.subjects) return []
      
      const allItems = result.subjects.map((item, index) => ({
        doubanId: item.id,
        title: item.title,
        titleEn: '',
        type: 'drama',
        mainCategory: '热剧',
        subCategory: '国产剧',
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
        status: 'ongoing',
        viewCount: 0,
        rank: index + 1
      }))
      
      allItems.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
      const filtered = allItems.slice(0, 30)
      
      this.setData({ subCategoryCounts: [0, 0, filtered.length] })
      
      return filtered
    } catch (err) {
      console.error('loadCNDramaFromDouban error:', err)
      return []
    }
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
