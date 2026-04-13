const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: 'cloud1-5gl9tqz7860b840c' })

const SERVER_URL = 'http://43.167.233.80:3000'

let dataCache = null
let dataCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

async function getData() {
  const now = Date.now()
  if (dataCache && now - dataCacheTime < CACHE_TTL) {
    return dataCache
  }

  const [varietyRes, movieChineseRes, movieAsiaRes, movieWesternRes, dramaChineseRes, dramaKoreanRes, dramaJapaneseRes] = await Promise.all([
    axios.get(SERVER_URL + '/api/variety').catch(() => null),
    axios.get(SERVER_URL + '/api/movie/chinese').catch(() => null),
    axios.get(SERVER_URL + '/api/movie/asia').catch(() => null),
    axios.get(SERVER_URL + '/api/movie/western').catch(() => null),
    axios.get(SERVER_URL + '/api/drama/chinese').catch(() => null),
    axios.get(SERVER_URL + '/api/drama/korean').catch(() => null),
    axios.get(SERVER_URL + '/api/drama/japanese').catch(() => null)
  ])

  dataCache = {
    variety: varietyRes?.data || { subjects: [], total: 0 },
    movie: {
      chinese: movieChineseRes?.data || { subjects: [], total: 0 },
      asia: movieAsiaRes?.data || { subjects: [], total: 0 },
      western: movieWesternRes?.data || { subjects: [], total: 0 }
    },
    drama: {
      chinese: dramaChineseRes?.data || { subjects: [], total: 0 },
      korean: dramaKoreanRes?.data || { subjects: [], total: 0 },
      japanese: dramaJapaneseRes?.data || { subjects: [], total: 0 }
    }
  }
  dataCacheTime = now
  return dataCache
}

async function getVariety() {
  const data = await getData()
  return data.variety
}

async function getMovie(event) {
  const { type } = event
  const data = await getData()
  return data.movie[type] || { subjects: [], total: 0 }
}

async function getDrama(event) {
  const { type } = event
  const data = await getData()
  return data.drama[type] || { subjects: [], total: 0 }
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
      default:
        return { subjects: [], total: 0, error: '无效的action: ' + action }
    }
  } catch (err) {
    console.error('dataService error:', err)
    return { subjects: [], total: 0, error: err.message }
  }
}
