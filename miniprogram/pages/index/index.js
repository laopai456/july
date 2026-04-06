const { movieApi } = require('../../utils/api')
const tmdb = require('../../utils/tmdb')

const TABS = ['综艺', '电影', '热剧']

const SUB_CATEGORIES = {
  '综艺': ['搞笑', '竞技', '恋爱'],
  '电影': ['国内', '国外'],
  '热剧': ['国内', '日剧', '韩剧']
}

Page({
  data: {
    tabs: TABS,
    currentTab: 0,
    currentTabName: '综艺',
    subCategories: SUB_CATEGORIES['综艺'],
    currentSub: 0,
    currentSubName: '搞笑',
    list: [],
    loading: true,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.resetAndLoad().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    const tabName = TABS[index]
    this.setData({
      currentTab: index,
      currentTabName: tabName,
      subCategories: SUB_CATEGORIES[tabName],
      currentSub: 0,
      currentSubName: SUB_CATEGORIES[tabName][0],
      list: [],
      page: 1,
      hasMore: true
    })
    this.loadData()
  },

  onSubChange(e) {
    const index = e.currentTarget.dataset.index
    const subName = SUB_CATEGORIES[this.data.currentTabName][index]
    this.setData({
      currentSub: index,
      currentSubName: subName,
      list: [],
      page: 1,
      hasMore: true
    })
    this.loadData()
  },

  async resetAndLoad() {
    this.setData({ page: 1, hasMore: true, list: [] })
    await this.loadData()
  },

  async loadData() {
    const { currentTabName, page } = this.data
    
    this.setData({ loading: true })

    try {
      const result = await movieApi.getList({
        mainCategory: currentTabName,
        page,
        pageSize: 20,
        sortBy: 'rating'
      })

      const list = result.list || []
      
      this.setData({
        list,
        hasMore: result.hasMore,
        loading: false
      })
      
      this.loadPosters(list)

    } catch (err) {
      if (err.errCode === -502005) {
        console.log('数据库正在初始化...')
        this.setData({ list: [], loading: false, hasMore: false })
      } else {
        console.error(err)
        this.setData({ loading: false })
      }
    }
  },

  async loadPosters(list) {
    const promises = list.map(async (item, i) => {
      if (!item.poster || !item.poster.includes('tmdb.org')) {
        const poster = await tmdb.getPoster(item)
        return { index: i, poster }
      }
      return null
    })
    
    const results = await Promise.all(promises)
    
    const updates = results.filter(r => r && r.poster)
    if (updates.length > 0) {
      const currentList = this.data.list
      updates.forEach(({ index, poster }) => {
        if (currentList[index]) {
          currentList[index].poster = poster
        }
      })
      this.setData({ list: currentList })
    }
  },

  async loadMore() {
    const { currentTabName, page, list } = this.data
    
    this.setData({ loading: true })

    try {
      const result = await movieApi.getList({
        mainCategory: currentTabName,
        page: page + 1,
        pageSize: 20,
        sortBy: 'rating'
      })

      const newList = result.list || []
      const combinedList = [...list, ...newList]
      
      this.setData({
        list: combinedList,
        page: page + 1,
        hasMore: result.hasMore,
        loading: false
      })
      
      this.loadPosters(newList)

    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    })
  },

  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/index'
    })
  },

  onPosterError(e) {
    const { index } = e.currentTarget.dataset
    const list = this.data.list
    if (list[index]) {
      list[index].poster = ''
      this.setData({ list })
    }
  }
})
