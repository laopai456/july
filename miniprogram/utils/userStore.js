const WATCHED_KEY = 'userWatched'
const FAVORITES_KEY = 'userFavorites'

function getWatched() {
  try { return wx.getStorageSync(WATCHED_KEY) || [] } catch (e) { return [] }
}

function getFavorites() {
  try { return wx.getStorageSync(FAVORITES_KEY) || [] } catch (e) { return [] }
}

function isWatched(doubanId) {
  return getWatched().includes(String(doubanId))
}

function isFavorite(doubanId) {
  return getFavorites().some(f => f.doubanId === String(doubanId))
}

function markWatched(doubanId) {
  const list = getWatched()
  const id = String(doubanId)
  if (!list.includes(id)) {
    list.push(id)
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
  const list = getWatched().filter(id => id !== String(doubanId))
  try { wx.setStorageSync(WATCHED_KEY, list) } catch (e) { console.error('unmarkWatched write fail', e) }
  return list
}

function filterWatched(items) {
  const watched = getWatched()
  if (watched.length === 0) return items
  return items.filter(item => !watched.includes(String(item.doubanId)))
}

module.exports = {
  getWatched, getFavorites, isWatched, isFavorite,
  markWatched, addFavorite, removeFavorite, unmarkWatched, filterWatched
}
