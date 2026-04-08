const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DOUBAN_API = 'https://movie.douban.com/j'

const FOREIGN_KEYWORDS = ['韩国', '日本', '美国', '英国', 'Korean', 'Japanese', 'American', 'Running Man', '无限挑战', '新西游记', '我独自生活', '认识的哥哥', 'Happy Together', 'Radio Star', '音乐银行', '人气歌谣', 'M COUNTDOWN', '蒙面歌王', '我家的熊孩子', '同床异梦', '妻子的味道', '三时三餐', '尹食堂', '姜食堂', '两天一夜', '超人回来了', '人生酒馆', '黄金渔场', '白钟元', '林中小屋', '暑假', '露营', '地球娱乐室', '海妖的呼唤', 'The Zone', '犯罪现场', '女高推理', '魔鬼的计谋']

const LOVE_KEYWORDS = ['恋爱', '相亲', '心动', '约会', '情侣', '喜欢你', '心动的信号', '恋梦空间', '女儿们的恋爱', '我们恋爱吧', '喜欢你我也是', '机智的恋爱', '半熟恋人', '再见爱人', '怦然心动', '非诚勿扰', '新相亲', '中国新相亲']

const FUNNY_KEYWORDS = ['搞笑', '喜剧', '脱口秀', '吐槽', '段子', '吐槽大会', '脱口秀大会', '欢乐喜剧人', '笑傲江湖', '跨界喜剧王', '周六夜现场', '今夜百乐门', '喜剧总动员', '笑声传奇', '开心剧乐部', '超级笑星', '我为喜剧狂', '欢乐集结号', '快乐大本营', '天天向上', '王牌对王牌', '奔跑吧', '极限挑战', '向往的生活', '青春环游记', '元气满满的哥哥', '朋友请听好', '做家务的男人', '婆婆和妈妈', '幸福三重奏', '我家小两口', '我家那闺女', '我家那小子', '妻子的浪漫旅行']

async function fetchDouban(url) {
  const https = require('https')
  
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://movie.douban.com/'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          console.error('JSON parse error:', e)
          resolve(null)
        }
      })
    })
    req.on('error', (e) => {
      console.error('Request error:', e)
      resolve(null)
    })
    req.setTimeout(8000, () => {
      req.destroy()
      resolve(null)
    })
  })
}

function isForeign(title) {
  for (const keyword of FOREIGN_KEYWORDS) {
    if (title.includes(keyword)) return true
  }
  return false
}

function getSubCategory(title) {
  for (const keyword of LOVE_KEYWORDS) {
    if (title.includes(keyword)) return '恋爱'
  }
  for (const keyword of FUNNY_KEYWORDS) {
    if (title.includes(keyword)) return '搞笑'
  }
  return '真人秀'
}

async function fetchByTag(tag, type, count) {
  const url = `${DOUBAN_API}/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=rank&page_limit=${count}&page_start=0`
  const result = await fetchDouban(url)
  console.log(`fetchByTag ${tag}:`, result ? result.subjects?.length : 'null')
  return result
}

exports.main = async (event, context) => {
  const { action, subCategory = '', count = 50 } = event
  
  if (action === 'getVariety') {
    try {
      let allItems = []
      const tags = ['综艺', '真人秀', '脱口秀', '娱乐']
      
      for (const tag of tags) {
        const data = await fetchByTag(tag, 'tv', 50)
        if (data && data.subjects) {
          for (const item of data.subjects) {
            if (isForeign(item.title)) continue
            if (allItems.some(i => i.doubanId === item.id)) continue
            
            const subCat = getSubCategory(item.title)
            
            allItems.push({
              doubanId: item.id,
              title: item.title,
              titleEn: '',
              type: 'variety',
              mainCategory: '综艺',
              subCategory: subCat,
              region: 'cn',
              year: item.year ? parseInt(item.year) : 2024,
              genres: [],
              poster: item.cover || '',
              rating: parseFloat(item.rate) || 0,
              ratingSource: 'douban',
              description: '',
              cast: [],
              status: 'ongoing',
              viewCount: 0,
              rank: allItems.length + 1
            })
          }
        }
      }
      
      console.log('Total variety items:', allItems.length)
      
      allItems.sort((a, b) => b.rating - a.rating)
      allItems = allItems.slice(0, count)
      allItems.forEach((item, i) => item.rank = i + 1)
      
      const counts = {
        '恋爱': allItems.filter(i => i.subCategory === '恋爱').length,
        '搞笑': allItems.filter(i => i.subCategory === '搞笑').length,
        '真人秀': allItems.filter(i => i.subCategory === '真人秀').length
      }
      
      let filteredItems = allItems
      if (subCategory === '恋爱') {
        filteredItems = allItems.filter(i => i.subCategory === '恋爱')
      } else if (subCategory === '搞笑') {
        filteredItems = allItems.filter(i => i.subCategory === '搞笑')
      } else if (subCategory === '真人秀') {
        filteredItems = allItems.filter(i => i.subCategory === '真人秀')
      }
      
      console.log('Filtered items:', filteredItems.length, 'counts:', counts)
      
      return {
        code: 0,
        data: filteredItems,
        counts: counts,
        total: allItems.length
      }
    } catch (err) {
      console.error('getVariety error:', err)
      return { code: -1, message: err.message, data: [], counts: { '恋爱': 0, '搞笑': 0, '真人秀': 0 } }
    }
  }
  
  if (action === 'getCNDrama') {
    try {
      let allItems = []
      const tags = ['国产剧', '华语剧', '大陆剧']
      
      for (const tag of tags) {
        const data = await fetchByTag(tag, 'tv', 50)
        if (data && data.subjects) {
          for (const item of data.subjects) {
            if (allItems.some(i => i.doubanId === item.id)) continue
            
            allItems.push({
              doubanId: item.id,
              title: item.title,
              titleEn: '',
              type: 'drama',
              mainCategory: '热剧',
              subCategory: '国产剧',
              region: 'cn',
              year: item.year ? parseInt(item.year) : 2024,
              genres: [],
              poster: item.cover || '',
              rating: parseFloat(item.rate) || 0,
              ratingSource: 'douban',
              description: '',
              cast: [],
              status: 'ongoing',
              viewCount: 0,
              rank: allItems.length + 1
            })
          }
        }
      }
      
      console.log('Total CNDrama items:', allItems.length)
      
      allItems.sort((a, b) => b.rating - a.rating)
      allItems = allItems.slice(0, count)
      allItems.forEach((item, i) => item.rank = i + 1)
      
      return {
        code: 0,
        data: allItems,
        total: allItems.length
      }
    } catch (err) {
      console.error('getCNDrama error:', err)
      return { code: -1, message: err.message, data: [] }
    }
  }
  
  return { code: -1, message: '未知操作' }
}
