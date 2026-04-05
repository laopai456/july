const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const TMDB_API_KEY = '96ac6a609d077c2d49da61e620697ea7'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500'

async function searchTMDB(title, type, titleEn) {
  const searchType = type === 'movie' ? 'movie' : 'tv'
  
  const searchQueries = [
    { query: title, language: 'zh-CN' },
    { query: title, language: 'en' },
    { query: titleEn || title }
  ]
  
  for (const params of searchQueries) {
    try {
      const res = await axios.get(`${TMDB_BASE_URL}/search/${searchType}`, {
        params: {
          api_key: TMDB_API_KEY,
          query: params.query,
          ...(params.language ? { language: params.language } : {})
        },
        timeout: 3000
      })
      
      if (res.data.results?.length > 0) {
        const result = res.data.results[0]
        if (result.poster_path) {
          return result
        }
      }
    } catch (err) {
      console.error('TMDB 搜索失败:', params.query, err.message)
    }
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
      const tmdbResult = await searchTMDB(item.title, item.type, item.titleEn)
      
      if (tmdbResult?.poster_path) {
        const posterUrl = `${TMDB_IMAGE_URL}${tmdbResult.poster_path}`
        
        await db.collection('movies').doc(item._id).update({
          data: {
            poster: posterUrl,
            posterCached: true,
            tmdbId: tmdbResult.id,
            updatedAt: db.serverDate()
          }
        })
        
        return {
          code: 0,
          message: '成功',
          data: {
            title: item.title,
            poster: posterUrl
          }
        }
      } else {
        await db.collection('movies').doc(item._id).update({
          data: {
            posterCached: true,
            updatedAt: db.serverDate()
          }
        })
        
        return {
          code: 0,
          message: '未找到',
          data: {
            title: item.title
          }
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
      
      return {
        code: 0,
        data: {
          total: totalRes.total,
          cached: cachedRes.total,
          uncached: totalRes.total - cachedRes.total
        }
      }
    } catch (err) {
      return { code: -1, message: err.message }
    }
  }
  
  return { code: -1, message: '未知操作' }
}
