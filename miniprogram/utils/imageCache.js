const POSTER_CACHE_PREFIX = 'poster_'
const CACHE_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000
const MAX_CACHE_SIZE = 50 * 1024 * 1024

const DEFAULT_POSTER = ''

async function getCachedPoster(item) {
  if (!item || !item._id) return DEFAULT_POSTER

  const cacheKey = `${POSTER_CACHE_PREFIX}${item._id}`
  
  try {
    const cached = wx.getStorageSync(cacheKey)
    
    if (cached && cached.url) {
      if (Date.now() - cached.cachedAt < CACHE_EXPIRE_TIME) {
        return cached.url
      } else {
        wx.removeStorageSync(cacheKey)
      }
    }
  } catch (e) {
    console.log('读取缓存失败:', e)
  }

  if (item.poster && item.poster.includes('tmdb.org')) {
    try {
      wx.setStorageSync(cacheKey, {
        url: item.poster,
        cachedAt: Date.now(),
        itemId: item._id
      })
      checkCacheSize()
    } catch (e) {
      console.log('写入缓存失败:', e)
    }
    return item.poster
  }

  return DEFAULT_POSTER
}

async function cachePosterWithUrl(itemId, url) {
  if (!itemId || !url) return
  
  const cacheKey = `${POSTER_CACHE_PREFIX}${itemId}`
  
  try {
    wx.setStorageSync(cacheKey, {
      url: url,
      cachedAt: Date.now(),
      itemId: itemId
    })
    checkCacheSize()
  } catch (e) {
    console.log('写入缓存失败:', e)
  }
}

function checkCacheSize() {
  try {
    const info = wx.getStorageInfoSync()
    
    if (info.currentSize > MAX_CACHE_SIZE / 1024) {
      clearOldestCache()
    }
  } catch (e) {
    console.log('检查缓存大小失败:', e)
  }
}

function clearOldestCache() {
  try {
    const keys = wx.getStorageInfoSync().keys
    const cacheItems = []
    
    keys.forEach(key => {
      if (key.startsWith(POSTER_CACHE_PREFIX)) {
        try {
          const cached = wx.getStorageSync(key)
          if (cached && cached.cachedAt) {
            cacheItems.push({ key, cachedAt: cached.cachedAt })
          }
        } catch (e) {}
      }
    })
    
    cacheItems.sort((a, b) => a.cachedAt - b.cachedAt)
    
    const deleteCount = Math.ceil(cacheItems.length * 0.3)
    for (let i = 0; i < deleteCount && i < cacheItems.length; i++) {
      wx.removeStorageSync(cacheItems[i].key)
    }
  } catch (e) {
    console.log('清理缓存失败:', e)
  }
}

function clearExpiredCache() {
  try {
    const keys = wx.getStorageInfoSync().keys
    const now = Date.now()
    
    keys.forEach(key => {
      if (key.startsWith(POSTER_CACHE_PREFIX)) {
        try {
          const cached = wx.getStorageSync(key)
          if (cached && now - cached.cachedAt > CACHE_EXPIRE_TIME) {
            wx.removeStorageSync(key)
          }
        } catch (e) {}
      }
    })
  } catch (e) {
    console.log('清理过期缓存失败:', e)
  }
}

function clearAllCache() {
  try {
    const keys = wx.getStorageInfoSync().keys
    keys.forEach(key => {
      if (key.startsWith(POSTER_CACHE_PREFIX)) {
        wx.removeStorageSync(key)
      }
    })
  } catch (e) {
    console.log('清空缓存失败:', e)
  }
}

module.exports = {
  getCachedPoster,
  cachePosterWithUrl,
  clearExpiredCache,
  clearAllCache
}
