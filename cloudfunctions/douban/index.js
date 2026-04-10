const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

const FOREIGN_VARIETY_KEYWORDS = ['韩国', '日本', '美国', '英国', 'Korean', 'Japanese', 'American', 'Running Man', '无限挑战', '新西游记', '我独自生活', '认识的哥哥', 'Happy Together', 'Radio Star', '音乐银行', '人气歌谣', 'M COUNTDOWN', '蒙面歌王', '我家的熊孩子', '同床异梦', '妻子的味道', '三时三餐', '尹食堂', '姜食堂', '两天一夜', '超人回来了', '人生酒馆', '黄金渔场', '白钟元', '林中小屋', '暑假', '露营', '地球娱乐室', '海妖的呼唤', 'The Zone', '犯罪现场', '女高推理', '魔鬼的计谋']

const LOVE_KEYWORDS = ['恋爱', '相亲', '心动', '约会', '情侣', '喜欢你', '心动的信号', '恋梦空间', '女儿们的恋爱', '我们恋爱吧', '喜欢你我也是', '机智的恋爱', '半熟恋人', '再见爱人', '怦然心动', '非诚勿扰', '新相亲', '中国新相亲']

const FUNNY_KEYWORDS = ['搞笑', '喜剧', '脱口秀', '吐槽', '段子', '吐槽大会', '脱口秀大会', '欢乐喜剧人', '笑傲江湖', '跨界喜剧王', '周六夜现场', '今夜百乐门', '喜剧总动员', '笑声传奇', '开心剧乐部', '超级笑星', '我为喜剧狂', '欢乐集结号', '快乐大本营', '天天向上', '王牌对王牌', '奔跑吧', '极限挑战', '向往的生活', '青春环游记', '元气满满的哥哥', '朋友请听好', '做家务的男人', '婆婆和妈妈', '幸福三重奏', '我家小两口', '我家那闺女', '我家那小子', '妻子的浪漫旅行']

const SUSPENSE_KEYWORDS = ['悬疑', '犯罪', '惊悚', '推理', '破案', '侦探', '谜案', '消失', '误杀', '孤注一掷', '满江红', '漫长的季节', '隐秘的角落', '沉默的真相']

const ROMANCE_KEYWORDS = ['爱情', '恋爱', '浪漫', '初恋', '心动', '怦然', '喜欢你', '你的名字', '情书', '怦然心动', '爱乐之城', '去有风的地方', '繁花']

const COMEDY_KEYWORDS = ['喜剧', '搞笑', '幽默', '开心', '快乐', '爆笑', '年会不能停', '热辣滚烫', '飞驰人生', '抓娃娃', '一年一度喜剧大赛', '脱口秀大会']

async function fetchTMDB(url) {
  const https = require('https')
  
  console.log('请求TMDB URL:', url)
  
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          console.log('TMDB响应成功')
          resolve(parsed)
        } catch (e) {
          console.error('TMDB JSON parse error:', e)
          resolve(null)
        }
      })
    })
    req.on('error', (e) => {
      console.error('TMDB Request error:', e)
      resolve(null)
    })
    req.setTimeout(5000, () => {
      console.error('TMDB Request timeout')
      req.destroy()
      resolve(null)
    })
  })
}

function getRegion(item) {
  const originCountry = item.origin_country?.[0] || ''
  const originalLanguage = item.original_language || ''
  
  if (originCountry === 'KR' || originalLanguage === 'ko') return 'kr'
  if (originCountry === 'JP' || originalLanguage === 'ja') return 'jp'
  if (originCountry === 'CN' || originCountry === 'TW' || originalLanguage === 'zh') return 'cn'
  if (originCountry === 'US' || originCountry === 'GB' || originalLanguage === 'en') return 'us'
  
  return 'other'
}

function getGenreName(id) {
  const genres = {
    28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
    99: '纪录', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
    27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
    10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部',
    10759: '动作冒险', 10762: '儿童', 10763: '新闻', 10764: '真人秀',
    10765: '科幻奇幻', 10766: '肥皂剧', 10767: '脱口秀', 10768: '战争政治'
  }
  return genres[id] || ''
}

function getSubCategoryForVariety(title, genres) {
  const allText = title + ' ' + (genres || []).join(' ')
  
  for (const keyword of LOVE_KEYWORDS) {
    if (allText.includes(keyword)) return '恋爱'
  }
  for (const keyword of FUNNY_KEYWORDS) {
    if (allText.includes(keyword)) return '搞笑'
  }
  return '真人秀'
}

function getSubCategoryForMovie(title, genres) {
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
}

function isForeignVariety(title) {
  for (const keyword of FOREIGN_VARIETY_KEYWORDS) {
    if (title.includes(keyword)) return true
  }
  return false
}

async function getPopularFromTMDB(type, page = 1) {
  const endpoint = type === 'movie' ? 'movie/popular' : 'tv/popular'
  const url = `${TMDB_API_BASE}/${endpoint}?api_key=${TMDB_API_KEY}&language=zh-CN&page=${page}`
  
  const result = await fetchTMDB(url)
  
  if (result && result.results) {
    return result.results
  }
  
  return []
}

exports.main = async (event, context) => {
  const { action, subCategory = '', count = 50 } = event
  
  console.log('收到请求:', action, subCategory, count)
  
  if (action === 'getVariety') {
    try {
      let allItems = []
      
      const popularTV = await getPopularFromTMDB('tv', 1)
      
      for (const item of popularTV) {
        if (isForeignVariety(item.name)) continue
        if (allItems.some(i => i.tmdbId === item.id)) continue
        
        const genres = item.genre_ids?.map(id => getGenreName(id)).filter(g => g) || []
        const subCat = getSubCategoryForVariety(item.name, genres)
        
        allItems.push({
          tmdbId: item.id,
          doubanId: `tmdb_${item.id}`,
          title: item.name,
          titleEn: item.original_name,
          type: 'variety',
          mainCategory: '综艺',
          subCategory: subCat,
          region: getRegion(item),
          year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
          genres: genres,
          poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
          rating: Math.round(item.vote_average * 10) / 10,
          ratingSource: 'tmdb',
          description: item.overview || '',
          cast: [],
          director: '',
          status: 'ongoing',
          viewCount: 0,
          rank: allItems.length + 1
        })
      }
      
      console.log(`综艺数据获取完成，共${allItems.length}条`)
      
      allItems.sort((a, b) => b.rating - a.rating)
      allItems = allItems.slice(0, count)
      
      allItems.forEach((item, i) => item.rank = i + 1)
      
      const counts = {
        '恋爱': allItems.filter(i => i.subCategory === '恋爱').length,
        '搞笑': allItems.filter(i => i.subCategory === '搞笑').length,
        '真人秀': allItems.filter(i => i.subCategory === '真人秀').length
      }
      
      let filteredItems = allItems
      if (subCategory === '恋爱') {
        filteredItems = allItems.filter(i => i.subCategory === '恋爱')
      } else if (subCategory === '搞笑') {
        filteredItems = allItems.filter(i => i.subCategory === '搞笑')
      } else if (subCategory === '真人秀') {
        filteredItems = allItems.filter(i => i.subCategory === '真人秀')
      }
      
      return {
        code: 0,
        data: filteredItems,
        counts: counts,
        total: allItems.length
      }
    } catch (err) {
      console.error('getVariety error:', err)
      return { code: -1, message: err.message, data: [], counts: { '恋爱': 0, '搞笑': 0, '真人秀': 0 } }
    }
  }
  
  if (action === 'getMovie') {
    try {
      let allItems = []
      
      const popularMovies = await getPopularFromTMDB('movie', 1)
      
      for (const item of popularMovies) {
        if (allItems.some(i => i.tmdbId === item.id)) continue
        
        const genres = item.genre_ids?.map(id => getGenreName(id)).filter(g => g) || []
        const subCat = getSubCategoryForMovie(item.title, genres)
        
        allItems.push({
          tmdbId: item.id,
          doubanId: `tmdb_${item.id}`,
          title: item.title,
          titleEn: item.original_title,
          type: 'movie',
          mainCategory: '电影',
          subCategory: subCat,
          region: getRegion(item),
          year: parseInt((item.release_date || '').substring(0, 4)) || 0,
          genres: genres,
          poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
          rating: Math.round(item.vote_average * 10) / 10,
          ratingSource: 'tmdb',
          description: item.overview || '',
          cast: [],
          director: '',
          status: 'released',
          viewCount: 0,
          rank: allItems.length + 1
        })
      }
      
      console.log(`电影数据获取完成，共${allItems.length}条`)
      
      allItems.sort((a, b) => b.rating - a.rating)
      allItems = allItems.slice(0, count)
      
      allItems.forEach((item, i) => item.rank = i + 1)
      
      const hotList = allItems.slice(0, 30)
      const highScoreList = allItems.filter(i => i.rating >= 7.5).slice(0, 30)
      const newList = allItems.filter(i => i.year >= 2023).slice(0, 30)
      
      const counts = {
        '热门': allItems.length,
        '高分': allItems.filter(i => i.rating >= 7.5).length,
        '最新': allItems.filter(i => i.year >= 2023).length
      }
      
      let filteredItems = hotList
      if (subCategory === '高分') {
        filteredItems = highScoreList
      } else if (subCategory === '最新') {
        filteredItems = newList
      }
      
      return {
        code: 0,
        data: filteredItems,
        counts: counts,
        total: allItems.length
      }
    } catch (err) {
      console.error('getMovie error:', err)
      return { code: -1, message: err.message, data: [], counts: { '热门': 0, '高分': 0, '最新': 0 } }
    }
  }
  
  if (action === 'getCNDrama') {
    try {
      let allItems = []
      
      const popularTV = await getPopularFromTMDB('tv', 1)
      
      for (const item of popularTV) {
        const region = getRegion(item)
        if (region !== 'cn') continue
        if (allItems.some(i => i.tmdbId === item.id)) continue
        
        const genres = item.genre_ids?.map(id => getGenreName(id)).filter(g => g) || []
        
        allItems.push({
          tmdbId: item.id,
          doubanId: `tmdb_${item.id}`,
          title: item.name,
          titleEn: item.original_name,
          type: 'drama',
          mainCategory: '热剧',
          subCategory: '国产剧',
          region: 'cn',
          year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
          genres: genres,
          poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
          rating: Math.round(item.vote_average * 10) / 10,
          ratingSource: 'tmdb',
          description: item.overview || '',
          cast: [],
          director: '',
          status: 'ongoing',
          viewCount: 0,
          rank: allItems.length + 1
        })
      }
      
      allItems.sort((a, b) => b.rating - a.rating)
      allItems = allItems.slice(0, count)
      
      allItems.forEach((item, i) => item.rank = i + 1)
      
      return {
        code: 0,
        data: allItems,
        total: allItems.length
      }
    } catch (err) {
      console.error('getCNDrama error:', err)
      return { code: -1, message: err.message, data: [] }
    }
  }
  
  if (action === 'getKDrama') {
    try {
      let allItems = []
      
      const popularTV = await getPopularFromTMDB('tv', 1)
      
      for (const item of popularTV) {
        const region = getRegion(item)
        if (region !== 'kr') continue
        if (allItems.some(i => i.tmdbId === item.id)) continue
        
        const genres = item.genre_ids?.map(id => getGenreName(id)).filter(g => g) || []
        
        allItems.push({
          tmdbId: item.id,
          doubanId: `tmdb_${item.id}`,
          title: item.name,
          titleEn: item.original_name,
          type: 'drama',
          mainCategory: '热剧',
          subCategory: '韩剧',
          region: 'kr',
          year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
          genres: genres,
          poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
          rating: Math.round(item.vote_average * 10) / 10,
          ratingSource: 'tmdb',
          description: item.overview || '',
          cast: [],
          director: '',
          status: 'ongoing',
          viewCount: 0,
          rank: allItems.length + 1
        })
      }
      
      allItems.sort((a, b) => b.rating - a.rating)
      allItems = allItems.slice(0, count)
      
      allItems.forEach((item, i) => item.rank = i + 1)
      
      return {
        code: 0,
        data: allItems,
        total: allItems.length
      }
    } catch (err) {
      console.error('getKDrama error:', err)
      return { code: -1, message: err.message, data: [] }
    }
  }
  
  if (action === 'getJDrama') {
    try {
      let allItems = []
      
      const popularTV = await getPopularFromTMDB('tv', 1)
      
      for (const item of popularTV) {
        const region = getRegion(item)
        if (region !== 'jp') continue
        if (allItems.some(i => i.tmdbId === item.id)) continue
        
        const genres = item.genre_ids?.map(id => getGenreName(id)).filter(g => g) || []
        
        allItems.push({
          tmdbId: item.id,
          doubanId: `tmdb_${item.id}`,
          title: item.name,
          titleEn: item.original_name,
          type: 'drama',
          mainCategory: '热剧',
          subCategory: '日剧',
          region: 'jp',
          year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
          genres: genres,
          poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
          rating: Math.round(item.vote_average * 10) / 10,
          ratingSource: 'tmdb',
          description: item.overview || '',
          cast: [],
          director: '',
          status: 'ongoing',
          viewCount: 0,
          rank: allItems.length + 1
        })
      }
      
      allItems.sort((a, b) => b.rating - a.rating)
      allItems = allItems.slice(0, count)
      
      allItems.forEach((item, i) => item.rank = i + 1)
      
      return {
        code: 0,
        data: allItems,
        total: allItems.length
      }
    } catch (err) {
      console.error('getJDrama error:', err)
      return { code: -1, message: err.message, data: [] }
    }
  }
  
  if (action === 'search') {
    try {
      const { keyword, count: searchCount = 20 } = event
      const url = `${TMDB_API_BASE}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(keyword)}&language=zh-CN`
      
      const result = await fetchTMDB(url)
      
      if (!result || !result.results) {
        return { code: 0, data: [], total: 0 }
      }
      
      const items = result.results.slice(0, searchCount).map((item, index) => {
        const isMovie = item.media_type === 'movie'
        const genres = item.genre_ids?.map(id => getGenreName(id)).filter(g => g) || []
        
        return {
          tmdbId: item.id,
          doubanId: `tmdb_${item.id}`,
          title: isMovie ? item.title : item.name,
          titleEn: isMovie ? item.original_title : item.original_name,
          type: isMovie ? 'movie' : 'drama',
          mainCategory: isMovie ? '电影' : '热剧',
          subCategory: '',
          region: getRegion(item),
          year: parseInt((item.release_date || item.first_air_date || '').substring(0, 4)) || 0,
          genres: genres,
          poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
          rating: Math.round(item.vote_average * 10) / 10,
          ratingSource: 'tmdb',
          description: item.overview || '',
          cast: [],
          director: '',
          status: 'ongoing',
          viewCount: 0,
          rank: index + 1
        }
      })
      
      return {
        code: 0,
        data: items,
        total: items.length
      }
    } catch (err) {
      console.error('search error:', err)
      return { code: -1, message: err.message, data: [] }
    }
  }
  
  return { code: -1, message: '未知操作' }
}
