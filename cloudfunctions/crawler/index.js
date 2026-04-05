const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500'

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: { api_key: TMDB_API_KEY, language: 'zh-CN' },
  timeout: 2000
})

function getRegion(lang) {
  const map = { zh: 'cn', ko: 'kr', ja: 'jp', en: 'us' }
  return map[lang?.toLowerCase()] || 'us'
}

function getGenreName(id) {
  const genres = {
    28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
    18: '剧情', 14: '奇幻', 27: '恐怖', 9648: '悬疑', 10749: '爱情', 878: '科幻',
    53: '惊悚', 10752: '战争', 10764: '真人秀'
  }
  return genres[id] || ''
}

const VARIETY_DATA = [
  { title: 'Running Man', region: 'kr', year: 2010, rating: 8.6, genres: ['真人秀', '游戏'] },
  { title: '新西游记', region: 'kr', year: 2015, rating: 9.5, genres: ['真人秀', '旅行'] },
  { title: '无限挑战', region: 'kr', year: 2005, rating: 9.6, genres: ['真人秀', '搞笑'] },
  { title: '认识的哥哥', region: 'kr', year: 2015, rating: 8.8, genres: ['真人秀', '脱口秀'] },
  { title: '向往的生活', region: 'cn', year: 2017, rating: 7.6, genres: ['真人秀', '生活'] },
  { title: '我独自生活', region: 'kr', year: 2013, rating: 8.9, genres: ['真人秀', '生活'] },
  { title: '种地吧', region: 'cn', year: 2023, rating: 8.9, genres: ['真人秀', '生活'] },
  { title: '极限挑战', region: 'cn', year: 2015, rating: 8.8, genres: ['真人秀', '游戏'] },
  { title: '明星大侦探', region: 'cn', year: 2016, rating: 9.0, genres: ['真人秀', '推理'] },
  { title: '一年一度喜剧大赛', region: 'cn', year: 2021, rating: 8.6, genres: ['喜剧', '竞技'] },
  { title: '心动的信号', region: 'cn', year: 2018, rating: 7.5, genres: ['真人秀', '恋爱'] },
  { title: '换乘恋爱', region: 'kr', year: 2021, rating: 8.7, genres: ['真人秀', '恋爱'] },
  { title: '快乐再出发', region: 'cn', year: 2022, rating: 9.6, genres: ['真人秀', '旅行'] },
  { title: '花儿与少年', region: 'cn', year: 2014, rating: 7.8, genres: ['真人秀', '旅行'] },
  { title: '爸爸去哪儿', region: 'cn', year: 2013, rating: 8.9, genres: ['真人秀', '亲子'] },
  { title: '我是歌手', region: 'cn', year: 2013, rating: 8.2, genres: ['真人秀', '音乐'] },
  { title: '中国好声音', region: 'cn', year: 2012, rating: 7.8, genres: ['真人秀', '音乐'] },
  { title: '奔跑吧', region: 'cn', year: 2014, rating: 7.2, genres: ['真人秀', '游戏'] },
  { title: '蒙面唱将', region: 'cn', year: 2016, rating: 8.0, genres: ['真人秀', '音乐'] },
  { title: '声入人心', region: 'cn', year: 2018, rating: 9.1, genres: ['真人秀', '音乐'] }
]

async function fetchTMDB(type, page) {
  const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular'
  try {
    const res = await tmdbApi.get(endpoint, { params: { page } })
    return res.data.results || []
  } catch (error) {
    console.error('TMDB 获取失败:', error.message)
    return []
  }
}

exports.main = async (event, context) => {
  const { type = 'variety', page = 1, index = 0 } = event
  const startTime = Date.now()
  
  console.log(`爬虫: type=${type}, page=${page}, index=${index}`)
  
  try {
    const collection = db.collection('movies')
    
    if (type === 'variety') {
      const item = VARIETY_DATA[index]
      if (!item) {
        return { code: 0, message: '综艺数据已全部导入', data: { done: true } }
      }
      
      const data = {
        title: item.title,
        type: 'variety',
        mainCategory: '综艺',
        region: item.region,
        year: item.year,
        genres: item.genres,
        rating: item.rating,
        ratingSource: 'manual',
        description: '',
        cast: [],
        status: 'ongoing',
        viewCount: 0,
        sourceId: `variety_${index + 1}`,
        updatedAt: db.serverDate()
      }
      
      await collection.add({ data })
      return { code: 0, message: '成功', data: { index, title: item.title, next: index + 1 } }
    }
    
    if (type === 'movie' || type === 'drama') {
      const results = await fetchTMDB(type, page)
      const item = results[index]
      if (!item) {
        return { code: 0, message: '本页数据已全部导入', data: { nextPage: page + 1 } }
      }
      
      const data = type === 'movie' ? {
        title: item.title,
        titleEn: item.original_title,
        type: 'movie',
        mainCategory: '电影',
        region: getRegion(item.original_language),
        year: parseInt((item.release_date || '').substring(0, 4)) || 0,
        genres: (item.genre_ids || []).map(getGenreName).filter(Boolean),
        poster: item.poster_path ? `${TMDB_IMAGE_URL}${item.poster_path}` : '',
        rating: Math.round(item.vote_average * 10) / 10,
        ratingSource: 'tmdb',
        description: item.overview || '',
        cast: [],
        status: 'completed',
        viewCount: 0,
        sourceId: String(item.id),
        updatedAt: db.serverDate()
      } : {
        title: item.name,
        titleEn: item.original_name,
        type: 'drama',
        mainCategory: '热剧',
        region: getRegion(item.original_language),
        year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
        genres: (item.genre_ids || []).map(getGenreName).filter(Boolean),
        poster: item.poster_path ? `${TMDB_IMAGE_URL}${item.poster_path}` : '',
        rating: Math.round(item.vote_average * 10) / 10,
        ratingSource: 'tmdb',
        description: item.overview || '',
        cast: [],
        episodes: 0,
        status: 'completed',
        viewCount: 0,
        sourceId: String(item.id),
        updatedAt: db.serverDate()
      }
      
      await collection.add({ data })
      const duration = Date.now() - startTime
      return { 
        code: 0, 
        message: '成功', 
        data: { 
          type, 
          page, 
          index, 
          title: data.title, 
          nextIndex: index + 1,
          duration: `${duration}ms`
        } 
      }
    }
    
    return { code: -1, message: '未知类型' }
    
  } catch (error) {
    return { code: -1, message: error.message }
  }
}
