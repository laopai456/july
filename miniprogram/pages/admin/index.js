const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

const FOREIGN_VARIETY_KEYWORDS = ['韩国', '日本', '美国', '英国', 'Korean', 'Japanese', 'American', 'Running Man', '无限挑战', '新西游记', '我独自生活', '认识的哥哥', 'Happy Together', 'Radio Star', '音乐银行', '人气歌谣', 'M COUNTDOWN', '蒙面歌王', '我家的熊孩子', '同床异梦', '妻子的味道', '三时三餐', '尹食堂', '姜食堂', '两天一夜', '超人回来了', '人生酒馆', '黄金渔场', '白钟元', '林中小屋', '暑假', '露营', '地球娱乐室', '海妖的呼唤', 'The Zone', '犯罪现场', '女高推理', '魔鬼的计谋']

const LOVE_KEYWORDS = ['恋爱', '相亲', '心动', '约会', '情侣', '喜欢你', '心动的信号', '恋梦空间', '女儿们的恋爱', '我们恋爱吧', '喜欢你我也是', '机智的恋爱', '半熟恋人', '再见爱人', '怦然心动', '非诚勿扰', '新相亲', '中国新相亲']

const FUNNY_KEYWORDS = ['搞笑', '喜剧', '脱口秀', '吐槽', '段子', '吐槽大会', '脱口秀大会', '欢乐喜剧人', '笑傲江湖', '跨界喜剧王', '周六夜现场', '今夜百乐门', '喜剧总动员', '笑声传奇', '开心剧乐部', '超级笑星', '我为喜剧狂', '欢乐集结号', '快乐大本营', '天天向上', '王牌对王牌', '奔跑吧', '极限挑战', '向往的生活', '青春环游记', '元气满满的哥哥', '朋友请听好', '做家务的男人', '婆婆和妈妈', '幸福三重奏', '我家小两口', '我家那闺女', '我家那小子', '妻子的浪漫旅行']

const SUSPENSE_KEYWORDS = ['悬疑', '犯罪', '惊悚', '推理', '破案', '侦探', '谜案', '消失', '误杀', '孤注一掷', '满江红', '漫长的季节', '隐秘的角落', '沉默的真相']

const ROMANCE_KEYWORDS = ['爱情', '恋爱', '浪漫', '初恋', '心动', '怦然', '喜欢你', '你的名字', '情书', '怦然心动', '爱乐之城', '去有风的地方', '繁花']

const COMEDY_KEYWORDS = ['喜剧', '搞笑', '幽默', '开心', '快乐', '爆笑', '年会不能停', '热辣滚烫', '飞驰人生', '抓娃娃', '一年一度喜剧大赛', '脱口秀大会']

Page({
  data: {
    logs: []
  },

  onLoad() {
    this.addLog('数据源：TMDB API（前端直接调用）')
    this.addLog('支持完整数据：类型/演员/简介等')
  },

  addLog(msg) {
    const logs = this.data.logs
    logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
    this.setData({ logs: logs.slice(0, 30) })
  },

  clearAllCache() {
    try {
      wx.removeStorageSync('tmdb_cache')
      wx.removeStorageSync('douban_cache')
      this.addLog('✓ 所有缓存已清除')
      wx.showToast({ title: '缓存已清除', icon: 'success' })
    } catch (e) {
      this.addLog('清除失败: ' + e.message)
    }
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
    
    for (const keyword of LOVE_KEYWORDS) {
      if (allText.includes(keyword)) return '恋爱'
    }
    for (const keyword of FUNNY_KEYWORDS) {
      if (allText.includes(keyword)) return '搞笑'
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

  async testTMDBVariety() {
    this.addLog('测试TMDB综艺数据...')
    
    try {
      const url = `${TMDB_API_BASE}/tv/popular?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`
      const result = await this.fetchTMDB(url)
      
      if (result && result.results) {
        let allItems = []
        
        for (const item of result.results) {
          if (this.isForeignVariety(item.name)) continue
          if (allItems.some(i => i.tmdbId === item.id)) continue
          
          const genres = item.genre_ids?.map(id => this.getGenreName(id)).filter(g => g) || []
          const subCat = this.getSubCategoryForVariety(item.name, genres)
          
          allItems.push({
            tmdbId: item.id,
            title: item.name,
            year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
            genres: genres,
            poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
            rating: Math.round(item.vote_average * 10) / 10,
            description: item.overview || '',
            subCategory: subCat
          })
        }
        
        this.addLog(`✓ TMDB综艺成功: ${allItems.length}条`)
        
        if (allItems.length > 0) {
          const firstItem = allItems[0]
          this.addLog(`首条: ${firstItem.title}`)
          this.addLog(`年份: ${firstItem.year || '无'}`)
          this.addLog(`类型: ${firstItem.genres?.join(',') || '无'}`)
          this.addLog(`评分: ${firstItem.rating || '无'}`)
          this.addLog(`简介: ${firstItem.description?.substring(0, 30) || '无'}...`)
          this.addLog(`子分类: ${firstItem.subCategory || '无'}`)
        }
      }
    } catch (err) {
      this.addLog('✗ TMDB综艺失败: ' + err.message)
    }
  },

  async testTMDBMovie() {
    this.addLog('测试TMDB电影数据...')
    
    try {
      const url = `${TMDB_API_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`
      const result = await this.fetchTMDB(url)
      
      if (result && result.results) {
        let allItems = []
        
        for (const item of result.results) {
          if (allItems.some(i => i.tmdbId === item.id)) continue
          
          const genres = item.genre_ids?.map(id => this.getGenreName(id)).filter(g => g) || []
          const subCat = this.getSubCategoryForMovie(item.title, genres)
          
          allItems.push({
            tmdbId: item.id,
            title: item.title,
            year: parseInt((item.release_date || '').substring(0, 4)) || 0,
            genres: genres,
            poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
            rating: Math.round(item.vote_average * 10) / 10,
            description: item.overview || '',
            subCategory: subCat
          })
        }
        
        this.addLog(`✓ TMDB电影成功: ${allItems.length}条`)
        
        if (allItems.length > 0) {
          const firstItem = allItems[0]
          this.addLog(`首条: ${firstItem.title} (${firstItem.year || '无年份'})`)
          this.addLog(`类型: ${firstItem.genres?.join(',') || '无'}`)
          this.addLog(`评分: ${firstItem.rating || '无'}`)
          this.addLog(`子分类: ${firstItem.subCategory || '无'}`)
        }
      }
    } catch (err) {
      this.addLog('✗ TMDB电影失败: ' + err.message)
    }
  },

  async testTMDBKDrama() {
    this.addLog('测试TMDB韩剧数据...')
    
    try {
      const url = `${TMDB_API_BASE}/tv/popular?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`
      const result = await this.fetchTMDB(url)
      
      if (result && result.results) {
        let allItems = []
        
        for (const item of result.results) {
          const originCountry = item.origin_country?.[0] || ''
          const originalLanguage = item.original_language || ''
          
          if (originCountry !== 'KR' && originalLanguage !== 'ko') continue
          if (allItems.some(i => i.tmdbId === item.id)) continue
          
          const genres = item.genre_ids?.map(id => this.getGenreName(id)).filter(g => g) || []
          
          allItems.push({
            tmdbId: item.id,
            title: item.name,
            year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
            genres: genres,
            poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
            rating: Math.round(item.vote_average * 10) / 10,
            description: item.overview || ''
          })
        }
        
        this.addLog(`✓ TMDB韩剧成功: ${allItems.length}条`)
        
        if (allItems.length > 0) {
          const firstItem = allItems[0]
          this.addLog(`首条: ${firstItem.title} (${firstItem.year || '无年份'})`)
          this.addLog(`类型: ${firstItem.genres?.join(',') || '无'}`)
        }
      }
    } catch (err) {
      this.addLog('✗ TMDB韩剧失败: ' + err.message)
    }
  },

  goBack() {
    wx.navigateBack()
  }
})
