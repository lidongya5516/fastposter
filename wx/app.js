App({
  globalData: {
    serverUrl: '',
    token: '',
    userInfo: null
  },

  onLaunch() {
    const settings = wx.getStorageSync('serverSettings')
    if (settings) {
      this.globalData.serverUrl = settings.serverUrl || ''
      this.globalData.token = settings.token || ''
    }
  },

  getServerUrl() {
    return this.globalData.serverUrl
  },

  getToken() {
    return this.globalData.token
  },

  isConfigured() {
    return !!(this.globalData.serverUrl && this.globalData.token)
  },

  showToast(title, icon = 'none') {
    wx.showToast({ title, icon, duration: 2000 })
  },

  showLoading(title = '加载中...') {
    wx.showLoading({ title, mask: true })
  },

  hideLoading() {
    wx.hideLoading()
  }
})
