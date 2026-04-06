const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500'

async function fetchPosterByTmdbId(tmdbId, type) {
  if (!tmdbId) return null
  
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY },
      timeout: 2500
    })
    if (res.data?.poster_path) {
      return `${TMDB_IMAGE_URL}${res.data.poster_path}`
    }
  } catch (err) {
    console.error('获取海报失败:', tmdbId, err.message)
  }
  return null
}

async function searchTMDB(title, type) {
  const searchType = type === 'movie' ? 'movie' : 'tv'
  
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/search/${searchType}`, {
      params: { 
        api_key: TMDB_API_KEY, 
        query: title
      },
      timeout: 2000
    })
    
    if (res.data.results?.[0]?.poster_path) {
      return `${TMDB_IMAGE_URL}${res.data.results[0].poster_path}`
    }
  } catch (err) {
    console.error('搜索失败:', title)
  }
  return null
}

exports.main = async (event, context) => {
  const { action } = event
  
  if (action === 'next') {
    try {
      const list = await db.collection('movies')
        .where({
          posterCached: _.neq(true)
        })
        .limit(1)
        .get()
      
      if (list.data.length === 0) {
        return { code: 0, message: '完成', data: { done: true } }
      }
      
      const item = list.data[0]
      let posterUrl = null
      
      if (item.tmdbId) {
        posterUrl = await fetchPosterByTmdbId(item.tmdbId, item.type)
      }
      
      if (!posterUrl && item.title) {
        posterUrl = await searchTMDB(item.title, item.type)
      }
      
      if (posterUrl) {
        await db.collection('movies').doc(item._id).update({
          data: {
            poster: posterUrl,
            posterCached: true,
            updatedAt: db.serverDate()
          }
        })
        
        return {
          code: 0,
          message: '成功',
          data: { title: item.title, poster: posterUrl }
        }
      } else {
        return {
          code: 0,
          message: '跳过',
          data: { title: item.title, skipped: true }
        }
      }
    } catch (err) {
      return { code: -1, message: err.message }
    }
  }
  
  if (action === 'status') {
    try {
      const totalRes = await db.collection('movies').count()
      const cachedRes = await db.collection('movies').where({
        posterCached: true
      }).count()
      
      const withPosterRes = await db.collection('movies').where({
        poster: _.neq('')
      }).count()
      
      return {
        code: 0,
        data: {
          total: totalRes.total,
          cached: cachedRes.total,
          withPoster: withPosterRes.total,
          uncached: totalRes.total - cachedRes.total
        }
      }
    } catch (err) {
      return { code: -1, message: err.message }
    }
  }
  
  return { code: -1, message: '未知操作' }
}
