Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    list: {
      type: Array,
      value: []
    },
    showMore: {
      type: Boolean,
      value: true
    },
    type: {
      type: String,
      value: ''
    }
  },

  methods: {
    onMoreTap() {
      const { type } = this.properties
      if (type) {
        wx.switchTab({
          url: '/pages/category/index'
        })
      }
    }
  }
})
