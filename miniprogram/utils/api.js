const callFunction = (name, action, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: {
        action,
        ...data
      },
      success: res => {
        if (res.result.code === 0) {
          resolve(res.result.data)
        } else {
          reject(new Error(res.result.message || '请求失败'))
        }
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

const movieApi = {
  getList: (params) => callFunction('movieService', 'getList', params),
  getDetail: (params) => callFunction('movieService', 'getDetail', params),
  getRecommendations: (params) => callFunction('movieService', 'getRecommendations', params),
  getSimilar: (params) => callFunction('movieService', 'getSimilar', params),
  getBanner: (params) => callFunction('movieService', 'getBanner', params),
  getSubCategoryList: (params) => callFunction('movieService', 'getSubCategoryList', params),
  refreshSubCategory: (params) => callFunction('movieService', 'refreshSubCategory', params),
  batchRefreshAll: () => callFunction('movieService', 'batchRefreshAll')
}

const searchApi = {
  search: (params) => callFunction('searchService', 'search', params),
  getHotKeywords: () => callFunction('searchService', 'getHotKeywords')
}

const userApi = {
  getUserInfo: () => callFunction('userService', 'getUserInfo'),
  updateUserInfo: (params) => callFunction('userService', 'updateUserInfo', params),
  toggleFavorite: (params) => callFunction('userService', 'toggleFavorite', params),
  getFavorites: (params) => callFunction('userService', 'getFavorites', params),
  addHistory: (params) => callFunction('userService', 'addHistory', params),
  getHistory: (params) => callFunction('userService', 'getHistory', params)
}

module.exports = {
  movieApi,
  searchApi,
  userApi,
  callFunction
}
