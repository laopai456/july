Page({
  data: {
    varietyLoading: false,
    varietyDone: false,
    varietyProgress: 0,
    movieLoading: false,
    movieDone: false,
    movieProgress: 0,
    dramaLoading: false,
    dramaDone: false,
    dramaProgress: 0,
    allLoading: false,
    cacheLoading: false,
    cacheProgress: 0,
    cacheTotal: 0,
    cachedCount: 0,
    uncachedCount: 0,
    totalCount: 0,
    validPosterCount: 0,
    logs: []
  },

  onLoad() {
    this.checkCacheStatus()
  },

  addLog(msg) {
    const logs = this.data.logs
    logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
    this.setData({ logs: logs.slice(0, 50) })
  },

  async checkCacheStatus() {
    const db = wx.cloud.database()
    
    try {
      const totalRes = await db.collection('movies').count()
      const cachedRes = await db.collection('movies').where({
        posterCached: true
      }).count()
      
      const totalCount = totalRes.total
      const cachedCount = cachedRes.total
      const uncachedCount = totalCount - cachedCount
      
      this.setData({
        totalCount,
        cachedCount,
        uncachedCount
      })
      
      this.addLog(`状态: 已缓存 ${cachedCount}/${totalCount}`)
    } catch (err) {
      this.addLog(`检查状态失败: ${err.message}`)
    }
  },

  async checkPosterStatus() {
    const db = wx.cloud.database()
    const MAX_LIMIT = 20
    
    try {
      this.addLog('检查图片数据...')
      
      const allData = await db.collection('movies')
        .limit(MAX_LIMIT)
        .field({ title: true, poster: true, posterCached: true })
        .get()
      
      let validCount = 0
      let invalidTitles = []
      
      for (const item of allData.data) {
        if (item.poster && item.poster.includes('tmdb.org')) {
          validCount++
        } else if (item.posterCached) {
          invalidTitles.push(item.title)
        }
      }
      
      this.setData({ validPosterCount: validCount })
      
      if (invalidTitles.length > 0) {
        this.addLog(`无效图片: ${invalidTitles.slice(0, 5).join(', ')}...`)
      }
      this.addLog(`有效图片: ${validCount}/${allData.data.length}`)
    } catch (err) {
      this.addLog(`检查失败: ${err.message}`)
    }
  },

  async resetCacheStatus() {
    const db = wx.cloud.database()
    const _ = db.command
    
    wx.showModal({
      title: '确认重置',
      content: '将重置所有记录的缓存状态，需要重新缓存图片',
      success: async (res) => {
        if (res.confirm) {
          try {
            this.addLog('正在重置缓存状态...')
            
            const result = await db.collection('movies')
              .where({
                posterCached: true
              })
              .update({
                data: {
                  posterCached: _.remove(),
                  poster: _.remove()
                }
              })
            
            this.addLog(`已重置 ${result.stats.updated} 条记录`)
            await this.checkCacheStatus()
            wx.showToast({ title: '重置完成', icon: 'success' })
          } catch (err) {
            this.addLog(`重置失败: ${err.message}`)
          }
        }
      }
    })
  },

  async callCrawler(data) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'crawler',
        data,
        success: res => resolve(res.result),
        fail: err => reject(err)
      })
    })
  },

  async callImageCacheWithRetry(data, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await new Promise((resolve, reject) => {
          wx.cloud.callFunction({
            name: 'imageCache',
            data,
            success: res => resolve(res.result),
            fail: err => reject(err)
          })
        })
        return res
      } catch (err) {
        if (i < maxRetries - 1) {
          await this.sleep(500)
        } else {
          throw err
        }
      }
    }
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  async cacheImages() {
    if (this.data.cacheLoading) return
    
    this.setData({ cacheLoading: true, cacheProgress: 0 })
    this.addLog('开始缓存图片...')
    await this.checkCacheStatus()
    
    this.setData({ cacheTotal: this.data.uncachedCount })
    
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 5
    
    while (consecutiveErrors < maxConsecutiveErrors) {
      try {
        const res = await this.callImageCacheWithRetry({ action: 'next' })
        
        if (res.code === 0) {
          consecutiveErrors = 0
          
          if (res.data.done) {
            this.addLog('图片缓存完成!')
            break
          } else {
            this.setData({ cacheProgress: this.data.cacheProgress + 1 })
            if (res.data.poster) {
              this.addLog(`缓存成功: ${res.data.title}`)
            } else {
              this.addLog(`未找到图片: ${res.data.title}`)
            }
          }
        } else {
          this.addLog(`错误: ${res.message}`)
          consecutiveErrors++
        }
        
        await this.sleep(200)
      } catch (err) {
        consecutiveErrors++
        this.addLog(`缓存失败(${consecutiveErrors}/${maxConsecutiveErrors})`)
        await this.sleep(1000)
      }
    }

    if (consecutiveErrors >= maxConsecutiveErrors) {
      this.addLog('连续失败过多，请稍后重试')
    }

    this.setData({ cacheLoading: false })
    await this.checkCacheStatus()
    wx.showToast({ title: '缓存完成', icon: 'success' })
  },

  async importVariety() {
    if (this.data.varietyLoading) return
    
    this.setData({ varietyLoading: true })
    this.addLog('开始导入综艺数据...')

    for (let i = 0; i < 20; i++) {
      try {
        const res = await this.callCrawler({ type: 'variety', index: i })
        if (res.code === 0) {
          this.setData({ varietyProgress: i + 1 })
          this.addLog(`综艺 ${i + 1}/20: ${res.data.title}`)
        }
        if (res.data && res.data.done) {
          this.setData({ varietyDone: true })
          break
        }
        await this.sleep(100)
      } catch (err) {
        this.addLog(`综艺导入失败: ${err.message}`)
      }
    }

    this.setData({ varietyLoading: false, varietyDone: true })
    this.addLog('综艺数据导入完成!')
  },

  async importMovies() {
    if (this.data.movieLoading) return
    
    this.setData({ movieLoading: true })
    this.addLog('开始导入电影数据...')

    let total = 0
    for (let page = 1; page <= 5 && total < 50; page++) {
      for (let index = 0; index < 10 && total < 50; index++) {
        try {
          const res = await this.callCrawler({ type: 'movie', page, index })
          if (res.code === 0 && res.data && res.data.title) {
            total++
            this.setData({ movieProgress: total })
            this.addLog(`电影 ${total}/50: ${res.data.title}`)
          }
          if (res.data && res.data.nextPage) break
          await this.sleep(100)
        } catch (err) {
          this.addLog(`电影导入失败: ${err.message}`)
        }
      }
    }

    this.setData({ movieLoading: false, movieDone: true })
    this.addLog('电影数据导入完成!')
  },

  async importDramas() {
    if (this.data.dramaLoading) return
    
    this.setData({ dramaLoading: true })
    this.addLog('开始导入热剧数据...')

    let total = 0
    for (let page = 1; page <= 5 && total < 50; page++) {
      for (let index = 0; index < 10 && total < 50; index++) {
        try {
          const res = await this.callCrawler({ type: 'drama', page, index })
          if (res.code === 0 && res.data && res.data.title) {
            total++
            this.setData({ dramaProgress: total })
            this.addLog(`热剧 ${total}/50: ${res.data.title}`)
          }
          if (res.data && res.data.nextPage) break
          await this.sleep(100)
        } catch (err) {
          this.addLog(`热剧导入失败: ${err.message}`)
        }
      }
    }

    this.setData({ dramaLoading: false, dramaDone: true })
    this.addLog('热剧数据导入完成!')
  },

  async importAll() {
    if (this.data.allLoading) return
    
    this.setData({ allLoading: true })
    this.addLog('开始批量导入所有数据...')

    await this.importVariety()
    await this.importMovies()
    await this.importDramas()

    this.setData({ allLoading: false })
    this.addLog('全部数据导入完成!')
    wx.showToast({ title: '导入完成', icon: 'success' })
  }
})
