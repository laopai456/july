const { movieApi } = require('../../utils/api')

Page({
  data: {
    id: '',
    movie: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      this.loadDetail(options.id)
    }
  },

  async loadDetail(id) {
    this.setData({ loading: true })

    try {
      const movie = await movieApi.getDetail({ id })
      this.setData({
        movie,
        loading: false
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  onShareAppMessage() {
    const { movie } = this.data
    return {
      title: movie ? movie.title : '影视推荐',
      path: `/pages/detail/index?id=${this.data.id}`
    }
  }
})
