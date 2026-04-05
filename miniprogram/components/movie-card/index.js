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
    defaultPoster: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"%3E%3Crect fill="%23e8f0f0" width="100" height="140"/%3E%3Ctext x="50" y="70" text-anchor="middle" fill="%239aa8b8" font-size="12"%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C/text%3E%3C/svg%3E'
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

    onImageError(e) {
      console.log('图片加载失败:', this.properties.movie?.title)
    }
  }
})
