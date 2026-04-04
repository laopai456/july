Component({
  properties: {
    movie: {
      type: Object,
      value: {}
    },
    size: {
      type: String,
      value: 'normal'
    }
  },

  data: {
    defaultPoster: '/images/default-goods-image.png'
  },

  methods: {
    onTap() {
      const { movie } = this.properties
      if (movie && movie._id) {
        wx.navigateTo({
          url: `/pages/detail/index?id=${movie._id}`
        })
      }
    },

    onImageError() {
      this.setData({
        'movie.poster': this.data.defaultPoster
      })
    }
  }
})
