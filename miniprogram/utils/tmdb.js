const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_API_BASE = 'https://api.themoviedb.org/3'

const posterCache = {}
const listCache = {}

function request(url, data) {
  return new Promise((resolve) => {
    wx.request({
      url,
      data,
      timeout: 20000,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          console.error('TMDB API error:', res.statusCode)
          resolve(null)
        }
      },
      fail: (err) => {
        console.error('TMDB request fail:', err)
        resolve(null)
      }
    })
  })
}

async function getPosterByTmdbId(tmdbId, type = 'tv') {
  if (!tmdbId) return ''
  
  const cacheKey = `${type}_${tmdbId}`
  if (posterCache[cacheKey]) return posterCache[cacheKey]

  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const data = await request(`${TMDB_API_BASE}/${endpoint}/${tmdbId}`, { api_key: TMDB_API_KEY })
  
  if (data?.poster_path) {
    const posterUrl = `${TMDB_IMAGE_BASE}${data.poster_path}`
    posterCache[cacheKey] = posterUrl
    return posterUrl
  }
  return ''
}

async function searchPoster(title, type = 'tv') {
  if (!title) return null
  
  const cacheKey = `search_${type}_${title}`
  if (posterCache[cacheKey]) return posterCache[cacheKey]

  const searchType = type === 'movie' ? 'movie' : 'tv'
  const data = await request(`${TMDB_API_BASE}/search/${searchType}`, {
    api_key: TMDB_API_KEY,
    query: title,
    language: 'zh-CN'
  })
  
  if (data?.results?.[0]?.poster_path) {
    const item = data.results[0]
    const result = {
      tmdbId: item.id,
      title: type === 'movie' ? item.title : item.name,
      titleEn: type === 'movie' ? item.original_title : item.original_name,
      poster: `${TMDB_IMAGE_BASE}${item.poster_path}`,
      rating: Math.round(item.vote_average * 10) / 10,
      year: parseInt((item.release_date || item.first_air_date || '').substring(0, 4)) || 0,
      overview: item.overview || ''
    }
    posterCache[cacheKey] = result
    return result
  }
  return null
}

async function getPoster(item) {
  if (item.poster && item.poster.includes('tmdb.org')) {
    return item.poster
  }

  if (item.tmdbId) {
    const tmdbType = item.type === 'movie' ? 'movie' : 'tv'
    const poster = await getPosterByTmdbId(item.tmdbId, tmdbType)
    if (poster) return poster
  }

  const result = await searchPoster(item.title, item.type)
  return result?.poster || ''
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

async function getPopularMovies(page = 1) {
  const cacheKey = `movies_popular_${page}`
  if (listCache[cacheKey]) return listCache[cacheKey]
  
  const data = await request(`${TMDB_API_BASE}/movie/popular`, {
    api_key: TMDB_API_KEY,
    page,
    language: 'zh-CN'
  })
  
  if (data?.results && Array.isArray(data.results)) {
    const items = data.results.map(item => ({
      tmdbId: item.id,
      title: item.title,
      titleEn: item.original_title,
      poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
      rating: Math.round(item.vote_average * 10) / 10,
      year: parseInt((item.release_date || '').substring(0, 4)) || 0,
      overview: item.overview || '',
      type: 'movie',
      mainCategory: '电影'
    }))
    listCache[cacheKey] = items
    return items
  }
  
  console.error('getPopularMovies: no results')
  return []
}

async function getPopularTV(page = 1) {
  const cacheKey = `tv_popular_${page}`
  if (listCache[cacheKey]) return listCache[cacheKey]
  
  const data = await request(`${TMDB_API_BASE}/tv/popular`, {
    api_key: TMDB_API_KEY,
    page,
    language: 'zh-CN'
  })
  
  if (data?.results && Array.isArray(data.results)) {
    const items = data.results.map(item => ({
      tmdbId: item.id,
      title: item.name,
      titleEn: item.original_name,
      poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
      rating: Math.round(item.vote_average * 10) / 10,
      year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
      overview: item.overview || '',
      type: 'drama',
      mainCategory: '热剧',
      region: getRegion(item)
    }))
    listCache[cacheKey] = items
    return items
  }
  
  console.error('getPopularTV: no results')
  return []
}

async function getOnTheAirTV(page = 1) {
  const cacheKey = `tv_onair_${page}`
  if (listCache[cacheKey]) return listCache[cacheKey]
  
  const data = await request(`${TMDB_API_BASE}/tv/on_the_air`, {
    api_key: TMDB_API_KEY,
    page,
    language: 'zh-CN'
  })
  
  if (data?.results && Array.isArray(data.results)) {
    const items = data.results.map(item => ({
      tmdbId: item.id,
      title: item.name,
      titleEn: item.original_name,
      poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
      rating: Math.round(item.vote_average * 10) / 10,
      year: parseInt((item.first_air_date || '').substring(0, 4)) || 0,
      overview: item.overview || '',
      type: 'drama',
      mainCategory: '热剧',
      region: getRegion(item)
    }))
    listCache[cacheKey] = items
    return items
  }
  
  console.error('getOnTheAirTV: no results')
  return []
}

async function getTrendingAll(timeWindow = 'week') {
  const cacheKey = `trending_${timeWindow}`
  if (listCache[cacheKey]) return listCache[cacheKey]
  
  const data = await request(`${TMDB_API_BASE}/trending/all/${timeWindow}`, {
    api_key: TMDB_API_KEY,
    language: 'zh-CN'
  })
  
  if (data?.results && Array.isArray(data.results)) {
    const items = data.results.map(item => {
      const isMovie = item.media_type === 'movie'
      return {
        tmdbId: item.id,
        title: isMovie ? item.title : item.name,
        titleEn: isMovie ? item.original_title : item.original_name,
        poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
        rating: Math.round(item.vote_average * 10) / 10,
        year: parseInt((item.release_date || item.first_air_date || '').substring(0, 4)) || 0,
        overview: item.overview || '',
        type: isMovie ? 'movie' : 'drama',
        mainCategory: isMovie ? '电影' : '热剧',
        region: getRegion(item)
      }
    })
    listCache[cacheKey] = items
    return items
  }
  
  console.error('getTrendingAll: no results')
  return []
}

module.exports = {
  getPoster,
  getPosterByTmdbId,
  searchPoster,
  getPopularMovies,
  getPopularTV,
  getOnTheAirTV,
  getTrendingAll,
  TMDB_IMAGE_BASE
}
