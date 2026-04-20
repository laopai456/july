App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-5gl9tqz7860b840c",
      dataImported: false
    }
    
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力")
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      })

      wx.cloud.callFunction({
        name: 'dataService',
        data: { action: 'getVariety' }
      }).catch(() => {})
    }
    
    console.log('小程序启动，请到调试页面手动导入数据')
  }
})
