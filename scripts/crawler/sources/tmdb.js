const axios = require('axios')
const config = require('../config')

const tmdbApi = axios.create({
  baseURL: config.tmdb.baseUrl,
  params: {
    api_key: config.tmdb.apiKey,
    language: config.tmdb.language
  }
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function getPopularMovies(page = 1) {
  try {
    const res = await tmdbApi.get('/movie/popular', { params: { page } })
    return res.data.results
  } catch (error) {
    console.error('TMDB 电影获取失败:', error.message)
    return []
  }
}

async function getPopularTV(page = 1) {
  try {
    const res = await tmdbApi.get('/tv/popular', { params: { page } })
    return res.data.results
  } catch (error) {
    console.error('TMDB 剧集获取失败:', error.message)
    return []
  }
}

async function getMovieDetail(id) {
  try {
    const res = await tmdbApi.get(`/movie/${id}`, {
      params: { append_to_response: 'credits' }
    })
    return res.data
  } catch (error) {
    console.error('TMDB 电影详情获取失败:', error.message)
    return null
  }
}

async function getTVDetail(id) {
  try {
    const res = await tmdbApi.get(`/tv/${id}`, {
      params: { append_to_response: 'credits' }
    })
    return res.data
  } catch (error) {
    console.error('TMDB 剧集详情获取失败:', error.message)
    return null
  }
}

function formatMovie(item, detail, rank) {
  const poster = item.poster_path 
    ? `${config.tmdb.imageBaseUrl}${item.poster_path}`
    : ''
  
  const cast = detail?.credits?.cast?.slice(0, 5).map(c => c.name) || []
  const director = detail?.credits?.crew?.find(c => c.job === 'Director')?.name || ''
  
  return {
    title: item.title || item.name,
    titleEn: item.original_title || item.original_name,
    type: 'movie',
    mainCategory: '电影',
    subCategory: '',
    region: getRegion(item.original_language),
    year: parseInt((item.release_date || item.first_air_date || '').substring(0, 4)) || 0,
    genres: item.genre_ids?.map(id => getGenreName(id)) || [],
    poster,
    rating: Math.round(item.vote_average * 10) / 10,
    ratingSource: 'tmdb',
    description: item.overview || '',
    cast,
    director,
    status: 'completed',
    viewCount: 0,
    rank,
    sourceId: String(item.id),
    sourceUrl: `https://www.themoviedb.org/movie/${item.id}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

function formatTV(item, detail, rank) {
  const poster = item.poster_path 
    ? `${config.tmdb.imageBaseUrl}${item.poster_path}`
    : ''
  
  const cast = detail?.credits?.cast?.slice(0, 5).map(c => c.name) || []
  
  return {
    title: item.name,
    titleEn: item.original_name,
    type: 'drama',
    mainCategory: '热剧',
    subCategory: '',
    region: getRegion(item.original_language),
    year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
    genres: item.genre_ids?.map(id => getGenreName(id)) || [],
    poster,
    rating: Math.round(item.vote_average * 10) / 10,
    ratingSource: 'tmdb',
    description: item.overview || '',
    cast,
    director: '',
    episodes: detail?.number_of_episodes || 0,
    status: detail?.in_production ? 'ongoing' : 'completed',
    viewCount: 0,
    rank,
    sourceId: String(item.id),
    sourceUrl: `https://www.themoviedb.org/tv/${item.id}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

function getRegion(lang) {
  const map = {
    'zh': 'cn',
    'cn': 'cn',
    'ko': 'kr',
    'ja': 'jp',
    'en': 'us',
    'us': 'us'
  }
  return map[lang?.toLowerCase()] || 'us'
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

async function fetchMovies(count = 150) {
  const movies = []
  const pages = Math.ceil(count / 20)
  
  console.log(`正在获取 TMDB 热门电影 (${count} 部)...`)
  
  for (let page = 1; page <= pages; page++) {
    const results = await getPopularMovies(page)
    
    for (const item of results) {
      if (movies.length >= count) break
      
      await sleep(250)
      const detail = await getMovieDetail(item.id)
      const movie = formatMovie(item, detail, movies.length + 1)
      movies.push(movie)
      console.log(`[${movies.length}/${count}] ${movie.title}`)
    }
    
    if (movies.length >= count) break
    await sleep(500)
  }
  
  return movies
}

async function fetchTVShows(count = 150) {
  const shows = []
  const pages = Math.ceil(count / 20)
  
  console.log(`正在获取 TMDB 热门剧集 (${count} 部)...`)
  
  for (let page = 1; page <= pages; page++) {
    const results = await getPopularTV(page)
    
    for (const item of results) {
      if (shows.length >= count) break
      
      await sleep(250)
      const detail = await getTVDetail(item.id)
      const show = formatTV(item, detail, shows.length + 1)
      shows.push(show)
      console.log(`[${shows.length}/${count}] ${show.title}`)
    }
    
    if (shows.length >= count) break
    await sleep(500)
  }
  
  return shows
}

module.exports = {
  fetchMovies,
  fetchTVShows
}
