Component({
  properties: {
    tabs: {
      type: Array,
      value: []
    },
    activeTab: {
      type: String,
      value: ''
    }
  },

  methods: {
    onTabTap(e) {
      const { code } = e.currentTarget.dataset
      this.triggerEvent('change', { code })
    }
  }
})
