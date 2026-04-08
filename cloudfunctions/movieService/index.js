const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-5gl9tqz7860b840c' })

const db = cloud.database()
const _ = db.command

async function ensureCollection(collectionName) {
  try {
    await db.collection(collectionName).limit(1).get()
    return true
  } catch (err) {
    if (err.errCode === -502005) {
      try {
        await db.createCollection(collectionName)
        console.log(`集合 ${collectionName} 创建成功`)
        return true
      } catch (e) {
        console.error(`创建集合 ${collectionName} 失败:`, e)
        return false
      }
    }
    return true
  }
}

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
  
  console.log('查询条件:', JSON.stringify(query), '排序:', sortBy)
  
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

async function getSubCategoryList(event) {
  const { mainCategory, subCategory, page = 1, pageSize = 30, showReserve = false } = event
  
  if (!mainCategory || !subCategory) {
    return { code: 1001, message: '参数错误：缺少mainCategory或subCategory' }
  }
  
  const collection = db.collection('movies')
  
  let query = {
    mainCategory,
    subCategory,
    year: _.gte(2020)
  }
  
  if (!showReserve) {
    query.isReserve = false
  }
  
  const countResult = await collection.where(query).count()
  const total = countResult.total
  
  const limit = Math.min(pageSize, 30)
  
  const listResult = await collection
    .where(query)
    .orderBy('rating', 'desc')
    .limit(limit)
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
      tags: true,
      isReserve: true
    })
    .get()
  
  const configCollection = db.collection('config')
  let refreshAt = null
  try {
    const configResult = await configCollection.doc(`refresh_${mainCategory}_${subCategory}`).get()
    refreshAt = configResult.data?.refreshAt || null
  } catch (e) {
    console.log('未找到刷新时间记录')
  }
  
  return {
    code: 0,
    data: {
      list: listResult.data,
      total: Math.min(total, 30),
      page: 1,
      pageSize: 30,
      hasMore: false,
      refreshAt
    }
  }
}

async function refreshSubCategory(event) {
  const { mainCategory, subCategory } = event
  
  if (!mainCategory || !subCategory) {
    return { code: 1001, message: '参数错误：缺少mainCategory或subCategory' }
  }
  
  const collection = db.collection('movies')
  
  await collection
    .where({
      mainCategory,
      subCategory,
      year: _.gte(2020)
    })
    .update({
      data: {
        isReserve: false,
        refreshAt: db.serverDate()
      }
    })
  
  await ensureCollection('config')
  
  const configCollection = db.collection('config')
  await configCollection.doc(`refresh_${mainCategory}_${subCategory}`).set({
    data: {
      refreshAt: db.serverDate(),
      mainCategory,
      subCategory
    }
  })
  
  const countResult = await collection
    .where({
      mainCategory,
      subCategory,
      year: _.gte(2020)
    })
    .count()
  
  return {
    code: 0,
    data: {
      refreshed: true,
      totalCount: countResult.total,
      refreshAt: new Date()
    }
  }
}

async function batchRefreshAll(event) {
  const subCategories = [
    { mainCategory: '综艺', subCategory: '恋爱' },
    { mainCategory: '综艺', subCategory: '搞笑' },
    { mainCategory: '综艺', subCategory: '真人秀' },
    { mainCategory: '电影', subCategory: '悬疑' },
    { mainCategory: '电影', subCategory: '恋爱' },
    { mainCategory: '电影', subCategory: '喜剧' },
    { mainCategory: '热剧', subCategory: '韩剧' },
    { mainCategory: '热剧', subCategory: '日剧' },
    { mainCategory: '热剧', subCategory: '国产剧' }
  ]
  
  await ensureCollection('config')
  
  const configCollection = db.collection('config')
  const now = db.serverDate()
  
  const promises = subCategories.map(({ mainCategory, subCategory }) => {
    return configCollection.doc(`refresh_${mainCategory}_${subCategory}`).set({
      data: {
        refreshAt: now,
        mainCategory,
        subCategory
      }
    })
  })
  
  await Promise.all(promises)
  
  return {
    code: 0,
    data: {
      message: '刷新时间已更新',
      refreshAt: new Date()
    }
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
      case 'getSubCategoryList':
        return await getSubCategoryList(event)
      case 'refreshSubCategory':
        return await refreshSubCategory(event)
      case 'batchRefreshAll':
        return await batchRefreshAll(event)
      default:
        return { code: -1, message: '无效的action' }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, message: err.message }
  }
}
