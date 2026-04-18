const WATCHED_KEY = 'userWatched'
const FAVORITES_KEY = 'userFavorites'

function getWatched() {
  try { return wx.getStorageSync(WATCHED_KEY) || [] } catch (e) { return [] }
}

function getFavorites() {
  try { return wx.getStorageSync(FAVORITES_KEY) || [] } catch (e) { return [] }
}

function getWatchedIds() {
  return getWatched().map(w => w.doubanId)
}

function isWatched(doubanId) {
  return getWatchedIds().includes(String(doubanId))
}

function isFavorite(doubanId) {
  return getFavorites().some(f => f.doubanId === String(doubanId))
}

function markWatched(item) {
  const list = getWatched()
  const id = String(item.doubanId)
  if (!list.some(w => w.doubanId === id)) {
    list.unshift({
      doubanId: id,
      title: item.title || '',
      poster: item.poster || '',
      rating: item.rating || 0,
      year: item.year || '',
      genres: item.genres || [],
      addedAt: Date.now()
    })
    try { wx.setStorageSync(WATCHED_KEY, list) } catch (e) { console.error('markWatched write fail', e) }
  }
  removeFavorite(id)
  return list
}

function addFavorite(item) {
  const list = getFavorites()
  const id = String(item.doubanId)
  if (list.some(f => f.doubanId === id)) return list
  list.unshift({
    doubanId: id,
    title: item.title,
    poster: item.poster || '',
    rating: item.rating || 0,
    year: item.year || '',
    genres: item.genres || [],
    addedAt: Date.now()
  })
  try { wx.setStorageSync(FAVORITES_KEY, list) } catch (e) { console.error('addFavorite write fail', e) }
  return list
}

function removeFavorite(doubanId) {
  const list = getFavorites().filter(f => f.doubanId !== String(doubanId))
  try { wx.setStorageSync(FAVORITES_KEY, list) } catch (e) { console.error('removeFavorite write fail', e) }
  return list
}

function unmarkWatched(doubanId) {
  const list = getWatched().filter(w => w.doubanId !== String(doubanId))
  try { wx.setStorageSync(WATCHED_KEY, list) } catch (e) { console.error('unmarkWatched write fail', e) }
  return list
}

function filterWatched(items) {
  const watchedIds = getWatchedIds()
  if (watchedIds.length === 0) return items
  return items.filter(item => !watchedIds.includes(String(item.doubanId)))
}

module.exports = {
  getWatched, getFavorites, getWatchedIds, isWatched, isFavorite,
  markWatched, addFavorite, removeFavorite, unmarkWatched, filterWatched
}
