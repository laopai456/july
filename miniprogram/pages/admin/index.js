const { movieApi } = require('../../utils/api')

const SUB_CATEGORIES = {
  '综艺': ['恋爱', '搞笑', '真人秀'],
  '电影': ['悬疑', '恋爱', '喜剧'],
  '热剧': ['韩剧', '日剧', '国产剧']
}

Page({
  data: {
    totalCount: 0,
    varietyCount: 0,
    movieCount: 0,
    dramaCount: 0,
    subCategoryStats: [],
    allLoading: false,
    refreshLoading: false,
    logs: []
  },

  onLoad() {
    this.checkDataStatus()
  },

  addLog(msg) {
    const logs = this.data.logs
    logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
    this.setData({ logs: logs.slice(0, 30) })
  },

  async checkDataStatus() {
    const db = wx.cloud.database()
    
    try {
      const [totalRes, varietyRes, movieRes, dramaRes] = await Promise.all([
        db.collection('movies').count(),
        db.collection('movies').where({ mainCategory: '综艺' }).count(),
        db.collection('movies').where({ mainCategory: '电影' }).count(),
        db.collection('movies').where({ mainCategory: '热剧' }).count()
      ])
      
      this.setData({
        totalCount: totalRes.total,
        varietyCount: varietyRes.total,
        movieCount: movieRes.total,
        dramaCount: dramaRes.total
      })
      
      this.addLog(`总计:${totalRes.total} 综艺:${varietyRes.total} 电影:${movieRes.total} 热剧:${dramaRes.total}`)
      
      await this.checkSubCategoryStats()
    } catch (err) {
      this.addLog(`检查失败: ${err.message}`)
    }
  },

  async checkSubCategoryStats() {
    const db = wx.cloud.database()
    const stats = []
    
    for (const [mainCategory, subCategories] of Object.entries(SUB_CATEGORIES)) {
      for (const subCategory of subCategories) {
        try {
          const countRes = await db.collection('movies')
            .where({ mainCategory, subCategory })
            .count()
          stats.push({
            mainCategory,
            subCategory,
            count: countRes.total
          })
        } catch (err) {
          stats.push({
            mainCategory,
            subCategory,
            count: 0
          })
        }
      }
    }
    
    this.setData({ subCategoryStats: stats })
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  callCrawler(data) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'crawler',
        data,
        success: res => resolve(res.result),
        fail: err => reject(err)
      })
    })
  },

  async importAll() {
    if (this.data.allLoading) return
    
    this.setData({ allLoading: true })
    let successCount = 0
    
    this.addLog('=== 导入综艺 (10条) ===')
    for (let i = 0; i < 10; i++) {
      try {
        const res = await this.callCrawler({ type: 'variety', index: i })
        if (res.code === 0 && res.data?.title) {
          successCount++
          this.addLog(`✓ ${res.data.title}`)
        }
      } catch (err) {}
      await this.sleep(50)
    }

    this.addLog('=== 导入电影 (10条) ===')
    for (let i = 0; i < 10; i++) {
      try {
        const res = await this.callCrawler({ type: 'movie', index: i })
        if (res.code === 0 && res.data?.title) {
          successCount++
          this.addLog(`✓ ${res.data.title}`)
        }
      } catch (err) {}
      await this.sleep(50)
    }

    this.addLog('=== 导入热剧 (10条) ===')
    for (let i = 0; i < 10; i++) {
      try {
        const res = await this.callCrawler({ type: 'drama', index: i })
        if (res.code === 0 && res.data?.title) {
          successCount++
          this.addLog(`✓ ${res.data.title}`)
        }
      } catch (err) {}
      await this.sleep(50)
    }

    this.setData({ allLoading: false })
    this.addLog(`=== 完成! 成功 ${successCount} 条 ===`)
    
    await this.checkDataStatus()
    wx.showToast({ title: `导入 ${successCount} 条`, icon: 'success' })
  },

  async refreshAllCategories() {
    if (this.data.refreshLoading) return
    
    this.setData({ refreshLoading: true })
    this.addLog('=== 开始刷新全部榜单 ===')
    
    try {
      const result = await movieApi.batchRefreshAll()
      
      for (const item of result.results) {
        this.addLog(`✓ ${item.mainCategory}-${item.subCategory}: ${item.count}部`)
      }
      
      this.addLog(`=== 刷新完成! ===`)
      wx.showToast({ title: '刷新成功', icon: 'success' })
      
      await this.checkSubCategoryStats()
    } catch (err) {
      this.addLog(`刷新失败: ${err.message}`)
      wx.showToast({ title: '刷新失败', icon: 'error' })
    }
    
    this.setData({ refreshLoading: false })
  }
})
