const axios = require('axios')
const cheerio = require('cheerio')
const config = require('../config')

const doubanApi = axios.create({
  baseURL: config.douban.baseUrl,
  headers: config.douban.headers,
  timeout: 10000
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPage(url) {
  try {
    const res = await doubanApi.get(url)
    return res.data
  } catch (error) {
    console.error('豆瓣页面获取失败:', error.message)
    return null
  }
}

async function fetchJson(url) {
  try {
    const res = await doubanApi.get(url, {
      headers: {
        ...config.douban.headers,
        'Accept': 'application/json'
      }
    })
    return res.data
  } catch (error) {
    console.error('豆瓣数据获取失败:', error.message)
    return null
  }
}

function parseItem($, item, rank, type, mainCategory) {
  const $item = $(item)
  const $link = $item.find('a.nbg')
  const title = $link.attr('title') || $item.find('.pl2 a').text().trim()
  const href = $link.attr('href') || ''
  const doubanId = href.match(/subject\/(\d+)/)?.[1] || ''
  
  const ratingText = $item.find('.rating_nums').text()
  const rating = parseFloat(ratingText) || 0
  
  const infoText = $item.find('.pl').last().text().trim()
  const yearMatch = infoText.match(/\d{4}/)
  const year = yearMatch ? parseInt(yearMatch[0]) : 0
  
  const $img = $item.find('img')
  let poster = $img.attr('src') || ''
  if (poster) {
    poster = poster.replace(/img\d\.doubanio\.com/, 'img2.doubanio.com')
    poster = poster.replace(/\/s_ratio_poster\//, '/l_ratio_poster/')
  }
  
  const region = parseRegion(infoText)
  const genres = parseGenres(infoText)
  
  return {
    title,
    titleEn: '',
    type,
    mainCategory,
    subCategory: '',
    region,
    year,
    genres,
    poster,
    rating,
    ratingSource: 'douban',
    description: '',
    cast: [],
    director: '',
    episodes: type === 'drama' ? parseEpisodes(infoText) : undefined,
    status: 'completed',
    viewCount: 0,
    rank,
    sourceId: doubanId,
    sourceUrl: href,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

function parseRegion(info) {
  if (info.includes('中国') || info.includes('大陆') || info.includes('香港') || info.includes('台湾')) return 'cn'
  if (info.includes('韩国')) return 'kr'
  if (info.includes('日本')) return 'jp'
  if (info.includes('美国') || info.includes('英国')) return 'us'
  return 'cn'
}

function parseGenres(info) {
  const genres = []
  const genreList = ['喜剧', '爱情', '动作', '科幻', '悬疑', '恐怖', '奇幻', '动画', '剧情', '犯罪', '战争', '历史', '传记', '音乐', '歌舞', '家庭', '冒险', '灾难', '纪录片', '真人秀']
  genreList.forEach(g => {
    if (info.includes(g)) genres.push(g)
  })
  return genres.slice(0, 3)
}

function parseEpisodes(info) {
  const match = info.match(/(\d+)集/)
  return match ? parseInt(match[1]) : 0
}

async function fetchVariety(count = 150) {
  console.log(`正在获取豆瓣综艺榜 (${count} 部)...`)
  const items = []
  
  const urls = [
    '/chart',
    '/explore?type=tv&tag=%E7%BB%BC%E8%89%BA&sort=recommend&page_limit=50&page_start=0'
  ]
  
  try {
    const data = await fetchJson('/j/search_subjects?type=tv&tag=%E7%BB%BC%E8%89%BA&sort=rank&page_limit=50&page_start=0')
    
    if (data && data.subjects) {
      for (let i = 0; i < Math.min(data.subjects.length, count); i++) {
        const item = data.subjects[i]
        items.push({
          title: item.title,
          titleEn: '',
          type: 'variety',
          mainCategory: '综艺',
          subCategory: '',
          region: parseRegion(item.title),
          year: item.year ? parseInt(item.year) : 0,
          genres: [],
          poster: item.cover || '',
          rating: parseFloat(item.rate) || 0,
          ratingSource: 'douban',
          description: '',
          cast: [],
          director: '',
          status: 'completed',
          viewCount: 0,
          rank: i + 1,
          sourceId: String(item.id),
          sourceUrl: item.url || '',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        console.log(`[${i + 1}/${count}] ${item.title}`)
      }
    }
  } catch (error) {
    console.error('豆瓣综艺获取失败，尝试备用方案...')
    
    const html = await fetchPage('/chart')
    if (html) {
      const $ = cheerio.load(html)
      $('.article .indent table').each((i, el) => {
        if (items.length >= count) return false
        const item = parseItem($, el, items.length + 1, 'variety', '综艺')
        if (item.title) {
          items.push(item)
          console.log(`[${items.length}/${count}] ${item.title}`)
        }
      })
    }
  }
  
  return items
}

async function fetchMovies(count = 150) {
  console.log(`正在获取豆瓣电影榜 (${count} 部)...`)
  const items = []
  
  try {
    const data = await fetchJson('/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&sort=rank&page_limit=50&page_start=0')
    
    if (data && data.subjects) {
      for (let i = 0; i < Math.min(data.subjects.length, count); i++) {
        const item = data.subjects[i]
        items.push({
          title: item.title,
          titleEn: '',
          type: 'movie',
          mainCategory: '电影',
          subCategory: '',
          region: parseRegion(item.title),
          year: item.year ? parseInt(item.year) : 0,
          genres: [],
          poster: item.cover || '',
          rating: parseFloat(item.rate) || 0,
          ratingSource: 'douban',
          description: '',
          cast: [],
          director: '',
          status: 'completed',
          viewCount: 0,
          rank: i + 1,
          sourceId: String(item.id),
          sourceUrl: item.url || '',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        console.log(`[${i + 1}/${count}] ${item.title}`)
      }
    }
  } catch (error) {
    console.error('豆瓣电影获取失败:', error.message)
  }
  
  return items
}

async function fetchDramas(count = 150) {
  console.log(`正在获取豆瓣剧集榜 (${count} 部)...`)
  const items = []
  
  try {
    const data = await fetchJson('/j/search_subjects?type=tv&tag=%E5%9B%BD%E4%BA%A7%E5%89%A7&sort=rank&page_limit=50&page_start=0')
    
    if (data && data.subjects) {
      for (let i = 0; i < Math.min(data.subjects.length, count); i++) {
        const item = data.subjects[i]
        items.push({
          title: item.title,
          titleEn: '',
          type: 'drama',
          mainCategory: '热剧',
          subCategory: '',
          region: 'cn',
          year: item.year ? parseInt(item.year) : 0,
          genres: [],
          poster: item.cover || '',
          rating: parseFloat(item.rate) || 0,
          ratingSource: 'douban',
          description: '',
          cast: [],
          director: '',
          episodes: 0,
          status: 'completed',
          viewCount: 0,
          rank: i + 1,
          sourceId: String(item.id),
          sourceUrl: item.url || '',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        console.log(`[${i + 1}/${count}] ${item.title}`)
      }
    }
  } catch (error) {
    console.error('豆瓣剧集获取失败:', error.message)
  }
  
  return items
}

module.exports = {
  fetchVariety,
  fetchMovies,
  fetchDramas
}
