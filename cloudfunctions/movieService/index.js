const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

async function getList(event) {
  const { type, mainCategory, subCategory, region, genre, page = 1, pageSize = 20, sortBy = 'rating' } = event
  
  const skip = (page - 1) * pageSize
  const collection = db.collection('movies')
  
  let query = {}
  
  if (type && type !== 'all') {
    query.type = type
  }
  
  if (mainCategory && mainCategory !== 'all') {
    query.mainCategory = mainCategory
  }
  
  if (subCategory && subCategory !== 'all') {
    query.subCategory = subCategory
  }
  
  if (region && region !== 'all' && region !== '') {
    query.region = region
  }
  
  if (genre && genre !== 'all' && genre !== '') {
    query.genres = _.in([genre])
  }
  
  let sortField = 'rating'
  let sortOrder = 'desc'
  
  switch (sortBy) {
    case 'year':
      sortField = 'year'
      sortOrder = 'desc'
      break
    case 'hot':
      sortField = 'viewCount'
      sortOrder = 'desc'
      break
    case 'rating':
    default:
      sortField = 'rating'
      sortOrder = 'desc'
  }
  
  const countResult = await collection.where(query).count()
  const total = countResult.total
  
  const listResult = await collection
    .where(query)
    .orderBy(sortField, sortOrder)
    .skip(skip)
    .limit(pageSize)
    .field({
      _id: true,
      title: true,
      titleEn: true,
      type: true,
      mainCategory: true,
      subCategory: true,
      region: true,
      year: true,
      genres: true,
      poster: true,
      rating: true,
      episodes: true,
      status: true,
      tags: true
    })
    .get()
  
  return {
    code: 0,
    data: {
      list: listResult.data,
      total,
      page,
      pageSize,
      hasMore: skip + listResult.data.length < total
    }
  }
}

async function getDetail(event) {
  const { id } = event
  
  if (!id) {
    return { code: 1001, message: '参数错误：缺少id' }
  }
  
  const collection = db.collection('movies')
  
  const result = await collection.doc(id).get()
  
  if (!result.data) {
    return { code: 1002, message: '数据不存在' }
  }
  
  await collection.doc(id).update({
    data: {
      viewCount: _.inc(1)
    }
  })
  
  return {
    code: 0,
    data: result.data
  }
}

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'getList':
        return await getList(event)
      case 'getDetail':
        return await getDetail(event)
      default:
        return { code: -1, message: '无效的action' }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, message: err.message }
  }
}
