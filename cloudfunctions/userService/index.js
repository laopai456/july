const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

async function getUserInfo(event) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  const collection = db.collection('users')
  
  const result = await collection.where({
    openid
  }).get()
  
  if (result.data.length === 0) {
    const newUser = {
      openid,
      nickName: '',
      avatarUrl: '',
      favorites: [],
      history: [],
      preferences: {
        genres: [],
        regions: [],
        actors: []
      },
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    
    await collection.add({ data: newUser })
    
    return {
      code: 0,
      data: newUser
    }
  }
  
  return {
    code: 0,
    data: result.data[0]
  }
}

async function updateUserInfo(event) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { nickName, avatarUrl } = event
  
  const collection = db.collection('users')
  
  const result = await collection.where({
    openid
  }).update({
    data: {
      nickName: nickName || '',
      avatarUrl: avatarUrl || '',
      updatedAt: db.serverDate()
    }
  })
  
  return {
    code: 0,
    data: { updated: result.stats.updated }
  }
}

async function toggleFavorite(event) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { movieId } = event
  
  if (!movieId) {
    return { code: 1001, message: '参数错误：缺少movieId' }
  }
  
  const collection = db.collection('users')
  
  const userResult = await collection.where({ openid }).get()
  
  if (userResult.data.length === 0) {
    return { code: 1002, message: '用户不存在' }
  }
  
  const user = userResult.data[0]
  const favorites = user.favorites || []
  const index = favorites.indexOf(movieId)
  
  let isFavorited = false
  
  if (index > -1) {
    favorites.splice(index, 1)
    isFavorited = false
  } else {
    favorites.push(movieId)
    isFavorited = true
  }
  
  await collection.where({ openid }).update({
    data: {
      favorites,
      updatedAt: db.serverDate()
    }
  })
  
  return {
    code: 0,
    data: {
      isFavorited,
      favorites
    }
  }
}

async function getFavorites(event) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { page = 1, pageSize = 20 } = event
  
  const userCollection = db.collection('users')
  const movieCollection = db.collection('movies')
  
  const userResult = await userCollection.where({ openid }).get()
  
  if (userResult.data.length === 0) {
    return { code: 0, data: { list: [], total: 0 } }
  }
  
  const favorites = userResult.data[0].favorites || []
  const total = favorites.length
  
  const skip = (page - 1) * pageSize
  const pagedFavorites = favorites.slice(skip, skip + pageSize)
  
  if (pagedFavorites.length === 0) {
    return {
      code: 0,
      data: { list: [], total, page, pageSize, hasMore: false }
    }
  }
  
  const moviesResult = await movieCollection
    .where({
      _id: _.in(pagedFavorites)
    })
    .field({
      _id: true,
      title: true,
      poster: true,
      rating: true,
      year: true,
      type: true
    })
    .get()
  
  const favoriteSet = new Set(pagedFavorites)
  const sortedList = pagedFavorites
    .map(id => moviesResult.data.find(m => m._id === id))
    .filter(Boolean)
  
  return {
    code: 0,
    data: {
      list: sortedList,
      total,
      page,
      pageSize,
      hasMore: skip + sortedList.length < total
    }
  }
}

async function addHistory(event) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { movieId } = event
  
  if (!movieId) {
    return { code: 1001, message: '参数错误：缺少movieId' }
  }
  
  const collection = db.collection('users')
  
  const userResult = await collection.where({ openid }).get()
  
  if (userResult.data.length === 0) {
    return { code: 1002, message: '用户不存在' }
  }
  
  const user = userResult.data[0]
  let history = user.history || []
  
  history = history.filter(item => item.movieId !== movieId)
  
  history.unshift({
    movieId,
    time: new Date().toISOString()
  })
  
  history = history.slice(0, 50)
  
  await collection.where({ openid }).update({
    data: {
      history,
      updatedAt: db.serverDate()
    }
  })
  
  return {
    code: 0,
    data: { history }
  }
}

async function getHistory(event) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { page = 1, pageSize = 20 } = event
  
  const userCollection = db.collection('users')
  const movieCollection = db.collection('movies')
  
  const userResult = await userCollection.where({ openid }).get()
  
  if (userResult.data.length === 0) {
    return { code: 0, data: { list: [], total: 0 } }
  }
  
  const history = userResult.data[0].history || []
  const total = history.length
  
  const skip = (page - 1) * pageSize
  const pagedHistory = history.slice(skip, skip + pageSize)
  
  if (pagedHistory.length === 0) {
    return {
      code: 0,
      data: { list: [], total, page, pageSize, hasMore: false }
    }
  }
  
  const movieIds = pagedHistory.map(item => item.movieId)
  
  const moviesResult = await movieCollection
    .where({
      _id: _.in(movieIds)
    })
    .field({
      _id: true,
      title: true,
      poster: true,
      rating: true,
      year: true,
      type: true
    })
    .get()
  
  const movieMap = {}
  moviesResult.data.forEach(m => {
    movieMap[m._id] = m
  })
  
  const list = pagedHistory
    .map(item => ({
      ...movieMap[item.movieId],
      viewTime: item.time
    }))
    .filter(item => item._id)
  
  return {
    code: 0,
    data: {
      list,
      total,
      page,
      pageSize,
      hasMore: skip + list.length < total
    }
  }
}

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'getUserInfo':
        return await getUserInfo(event)
      case 'updateUserInfo':
        return await updateUserInfo(event)
      case 'toggleFavorite':
        return await toggleFavorite(event)
      case 'getFavorites':
        return await getFavorites(event)
      case 'addHistory':
        return await addHistory(event)
      case 'getHistory':
        return await getHistory(event)
      default:
        return { code: -1, message: '无效的action' }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, message: err.message }
  }
}
