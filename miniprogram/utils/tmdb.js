const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_API_BASE = 'https://api.themoviedb.org/3'

const posterCache = {}

function request(url, data) {
  return new Promise((resolve) => {
    wx.request({
      url,
      data,
      timeout: 5000,
      success: (res) => resolve(res.data),
      fail: () => resolve(null)
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
  if (!title) return ''
  
  const cacheKey = `search_${type}_${title}`
  if (posterCache[cacheKey]) return posterCache[cacheKey]

  const searchType = type === 'movie' ? 'movie' : 'tv'
  const data = await request(`${TMDB_API_BASE}/search/${searchType}`, {
    api_key: TMDB_API_KEY,
    query: title
  })
  
  if (data?.results?.[0]?.poster_path) {
    const posterUrl = `${TMDB_IMAGE_BASE}${data.results[0].poster_path}`
    posterCache[cacheKey] = posterUrl
    return posterUrl
  }
  return ''
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

  const poster = await searchPoster(item.title, item.type)
  return poster
}

module.exports = {
  getPoster,
  getPosterByTmdbId,
  searchPoster,
  TMDB_IMAGE_BASE
}
