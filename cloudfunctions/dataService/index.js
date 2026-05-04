const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: 'cloud1-5gl9tqz7860b840c' })

const SERVER_URL = 'http://43.167.233.80:3000'
const CACHE_TTL = 5 * 60 * 1000

const apiCache = {}

async function fetchApi(key, url) {
  const now = Date.now()
  const cached = apiCache[key]
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data
  }

  try {
    const res = await axios.get(url, { timeout: 10000 })
    const data = res.data || { subjects: [], total: 0 }
    apiCache[key] = { data, time: now }
    return data
  } catch (e) {
    if (cached) return cached.data
    return { subjects: [], total: 0 }
  }
}

async function getVariety() {
  return fetchApi('variety', SERVER_URL + '/api/variety')
}

async function getMovie(event) {
  const { type } = event
  if (!type) return { subjects: [], total: 0 }
  return fetchApi('movie_' + type, SERVER_URL + '/api/movie/' + type)
}

async function getDrama(event) {
  const { type } = event
  if (!type) return { subjects: [], total: 0 }
  return fetchApi('drama_' + type, SERVER_URL + '/api/drama/' + type)
}

async function getSubject(event) {
  const { id } = event
  if (!id) {
    return { id: '', summary: '' }
  }

  try {
    const res = await axios.get(SERVER_URL + '/api/subject/' + encodeURIComponent(id), { timeout: 10000 })
    return res.data
  } catch (e) {
    return { id, summary: '' }
  }
}

let genreCache = {}
let genreCacheTime = 0
const GENRE_CACHE_TTL = 10 * 60 * 1000

async function getGenre(event) {
  const { name, section, limit } = event
  const now = Date.now()

  if (!genreCache[name] || now - genreCacheTime > GENRE_CACHE_TTL) {
    try {
      const res = await axios.get(SERVER_URL + '/api/genre/' + encodeURIComponent(name), { timeout: 10000 })
      genreCache[name] = res.data
      genreCacheTime = now
    } catch (e) {
      return { subjects: [], total: 0 }
    }
  }

  const data = genreCache[name]
  if (!data) return { subjects: [], total: 0 }

  const sliceCount = limit ? parseInt(limit) : 0

  if (section === 'movie') {
    const all = data.movie || []
    const subjects = sliceCount > 0 ? all.slice(0, sliceCount) : all
    return { subjects, total: data.movieTotal || all.length }
  }
  if (section === 'drama') {
    const all = data.drama || []
    const subjects = sliceCount > 0 ? all.slice(0, sliceCount) : all
    return { subjects, total: data.dramaTotal || all.length }
  }

  if (sliceCount > 0) {
    return {
      movie: (data.movie || []).slice(0, sliceCount),
      drama: (data.drama || []).slice(0, sliceCount),
      movieTotal: data.movieTotal || (data.movie || []).length,
      dramaTotal: data.dramaTotal || (data.drama || []).length,
      updatedAt: data.updatedAt,
      source: data.source
    }
  }

  return data
}

async function getSubjectsBatch(event) {
  const { titles } = event
  if (!Array.isArray(titles) || titles.length === 0) {
    return {}
  }

  try {
    const res = await axios.post(SERVER_URL + '/api/subjects/batch', { titles }, { timeout: 30000 })
    return res.data
  } catch (e) {
    return {}
  }
}

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'getVariety':
        return await getVariety()
      case 'getMovie':
        return await getMovie(event)
      case 'getDrama':
        return await getDrama(event)
      case 'getSubject':
        return await getSubject(event)
      case 'getSubjectsBatch':
        return await getSubjectsBatch(event)
      case 'getGenre':
        return await getGenre(event)
      default:
        return { subjects: [], total: 0, error: '无效的action: ' + action }
    }
  } catch (err) {
    console.error('dataService error:', err)
    return { subjects: [], total: 0, error: err.message }
  }
}
