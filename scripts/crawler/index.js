const fs = require('fs')
const path = require('path')
const douban = require('./sources/douban')
const tmdb = require('./sources/tmdb')
const config = require('./config')

const outputDir = path.join(__dirname, config.output.dir)

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function saveJsonLines(data, filename) {
  const filepath = path.join(outputDir, filename)
  const content = data.map(item => JSON.stringify(item)).join('\n')
  fs.writeFileSync(filepath, content, 'utf-8')
  console.log(`已保存 ${data.length} 条数据到 ${filepath}`)
}

function mergeData(doubanData, tmdbData, type) {
  const merged = []
  const seen = new Set()
  
  for (const item of doubanData) {
    const key = item.title.toLowerCase().replace(/\s/g, '')
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }
  
  for (const item of tmdbData) {
    const key = item.title.toLowerCase().replace(/\s/g, '')
    const keyEn = (item.titleEn || '').toLowerCase().replace(/\s/g, '')
    
    if (!seen.has(key) && !seen.has(keyEn)) {
      seen.add(key)
      item.rank = merged.length + 1
      merged.push(item)
    }
  }
  
  merged.sort((a, b) => b.rating - a.rating)
  merged.forEach((item, i) => {
    item.rank = i + 1
  })
  
  return merged.slice(0, 150)
}

async function main() {
  console.log('========================================')
  console.log('影视排行榜数据爬虫')
  console.log('========================================\n')
  
  ensureDir(outputDir)
  
  console.log('\n[1/6] 获取豆瓣综艺...')
  const doubanVariety = await douban.fetchVariety(50)
  saveJsonLines(doubanVariety, 'douban_variety.json')
  
  console.log('\n[2/6] 获取豆瓣电影...')
  const doubanMovies = await douban.fetchMovies(50)
  saveJsonLines(doubanMovies, 'douban_movies.json')
  
  console.log('\n[3/6] 获取豆瓣剧集...')
  const doubanDramas = await douban.fetchDramas(50)
  saveJsonLines(doubanDramas, 'douban_dramas.json')
  
  console.log('\n[4/6] 获取 TMDB 热门电影...')
  const tmdbMovies = await tmdb.fetchMovies(100)
  saveJsonLines(tmdbMovies, 'tmdb_movies.json')
  
  console.log('\n[5/6] 获取 TMDB 热门剧集...')
  const tmdbDramas = await tmdb.fetchTVShows(100)
  saveJsonLines(tmdbDramas, 'tmdb_dramas.json')
  
  console.log('\n[6/6] 合并数据...')
  
  const varietyFinal = doubanVariety.slice(0, 150)
  varietyFinal.forEach((item, i) => { item.rank = i + 1 })
  
  const moviesFinal = mergeData(doubanMovies, tmdbMovies, 'movie')
  const dramasFinal = mergeData(doubanDramas, tmdbDramas, 'drama')
  
  const allData = [...varietyFinal, ...moviesFinal, ...dramasFinal]
  
  saveJsonLines(allData, config.output.filename)
  
  console.log('\n========================================')
  console.log('数据抓取完成!')
  console.log(`综艺: ${varietyFinal.length} 部`)
  console.log(`电影: ${moviesFinal.length} 部`)
  console.log(`热剧: ${dramasFinal.length} 部`)
  console.log(`总计: ${allData.length} 部`)
  console.log('========================================')
}

main().catch(console.error)
