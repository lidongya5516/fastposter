const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    configured: false,
    posters: [],
    loading: false,
    refreshing: false
  },

  onShow() {
    this.checkConfig()
  },

  onPullDownRefresh() {
    if (this.data.configured) {
      this.loadPosters()
    }
    wx.stopPullDownRefresh()
  },

  checkConfig() {
    const configured = app.isConfigured()
    this.setData({ configured })
    if (configured) {
      this.loadPosters()
    }
  },

  loadPosters() {
    this.setData({ loading: true })
    api.getPosters().then(res => {
      if (res.data.code === 0) {
        const posters = (res.data.data.posters || []).map(p => ({
          ...p,
          previewUrl: p.preview ? util.getPreviewUrl(app.getServerUrl(), p.preview) : '',
          updateTime: util.formatTime(p.updateTime)
        }))
        this.setData({ posters, loading: false, refreshing: false })
      } else {
        app.showToast(res.data.msg || '加载失败')
        this.setData({ loading: false, refreshing: false })
      }
    }).catch(err => {
      app.showToast(err.msg || '加载失败')
      this.setData({ loading: false, refreshing: false })
    })
  },

  onRefresh() {
    this.setData({ refreshing: true })
    this.loadPosters()
  },

  goEditor(e) {
    const { id, code } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/editor/editor?id=${id}&code=${code}`
    })
  },

  goSettings() {
    wx.switchTab({ url: '/pages/settings/settings' })
  }
})
