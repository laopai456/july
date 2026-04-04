const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const HOT_KEYWORDS = [
  '黑暗荣耀',
  '请回答1988',
  '鬼怪',
  '非自然死亡',
  '初恋',
  '漫长的季节',
  '狂飙',
  '奥本海默',
  '流浪地球',
  '三体'
]

async function search(event) {
  const { keyword, page = 1, pageSize = 20 } = event
  
  if (!keyword || keyword.trim() === '') {
    return { code: 1001, message: '参数错误：缺少搜索关键词' }
  }
  
  const trimmedKeyword = keyword.trim()
  const skip = (page - 1) * pageSize
  const collection = db.collection('movies')
  
  const result = await collection
    .where(_.or([
      {
        title: db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })
      },
      {
        titleEn: db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })
      },
      {
        cast: _.in([db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })])
      },
      {
        director: db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })
      }
    ]))
    .orderBy('rating', 'desc')
    .skip(skip)
    .limit(pageSize)
    .field({
      _id: true,
      title: true,
      titleEn: true,
      type: true,
      region: true,
      year: true,
      genres: true,
      poster: true,
      rating: true,
      episodes: true
    })
    .get()
  
  const countResult = await collection
    .where(_.or([
      {
        title: db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })
      },
      {
        titleEn: db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })
      },
      {
        cast: _.in([db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })])
      },
      {
        director: db.RegExp({
          regexp: trimmedKeyword,
          options: 'i'
        })
      }
    ]))
    .count()
  
  return {
    code: 0,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      pageSize,
      keyword: trimmedKeyword,
      hasMore: skip + result.data.length < countResult.total
    }
  }
}

async function getHotKeywords(event) {
  return {
    code: 0,
    data: HOT_KEYWORDS
  }
}

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'search':
        return await search(event)
      case 'getHotKeywords':
        return await getHotKeywords(event)
      default:
        return { code: -1, message: '无效的action' }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, message: err.message }
  }
}
