const { movieApi } = require('../../utils/api')

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
    const { currentTabName, currentSubName, page } = this.data
    
    this.setData({ loading: true })

    try {
      const result = await movieApi.getList({
        mainCategory: currentTabName,
        subCategory: currentSubName,
        page,
        pageSize: 20,
        sortBy: 'rating'
      })

      this.setData({
        list: result.list,
        hasMore: result.hasMore,
        loading: false
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    const { currentTabName, currentSubName, page, list } = this.data
    
    this.setData({ loading: true })

    try {
      const result = await movieApi.getList({
        mainCategory: currentTabName,
        subCategory: currentSubName,
        page: page + 1,
        pageSize: 20,
        sortBy: 'rating'
      })

      this.setData({
        list: [...list, ...result.list],
        page: page + 1,
        hasMore: result.hasMore,
        loading: false
      })
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
  }
})
