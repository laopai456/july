Page({
  data: {
    logs: []
  },

  onLoad() {
    this.addLog('数据已改为实时获取，无需导入')
    this.addLog('综艺/国产剧: 豆瓣API')
    this.addLog('电影/韩剧/日剧: TMDB API')
  },

  addLog(msg) {
    const logs = this.data.logs
    logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
    this.setData({ logs: logs.slice(0, 30) })
  },

  clearAllCache() {
    try {
      wx.removeStorageSync('tmdb_cache')
      this.addLog('✓ 缓存已清除')
      wx.showToast({ title: '缓存已清除', icon: 'success' })
    } catch (e) {
      this.addLog('清除失败: ' + e.message)
    }
  },

  testTMDB() {
    this.addLog('测试TMDB连接...')
    
    wx.request({
      url: 'https://api.themoviedb.org/3/movie/popular',
      data: {
        api_key: '96ac6a609d077c2d49da61e620697ea7',
        language: 'zh-CN',
        page: 1
      },
      timeout: 20000,
      success: (res) => {
        if (res.data && res.data.results) {
          this.addLog(`✓ TMDB连接成功: ${res.data.results.length}条数据`)
        } else {
          this.addLog('✗ TMDB返回数据异常')
        }
      },
      fail: (err) => {
        this.addLog('✗ TMDB连接失败: ' + err.errMsg)
      }
    })
  },

  testDouban() {
    this.addLog('测试豆瓣云函数...')
    
    wx.cloud.callFunction({
      name: 'douban',
      data: {
        action: 'getVariety',
        subCategory: '',
        count: 5
      },
      success: (res) => {
        if (res.result && res.result.code === 0) {
          this.addLog(`✓ 豆瓣云函数成功: ${res.result.data?.length || 0}条`)
        } else {
          this.addLog('✗ 豆瓣云函数返回异常: ' + JSON.stringify(res.result))
        }
      },
      fail: (err) => {
        this.addLog('✗ 豆瓣云函数失败: ' + err.errMsg)
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
