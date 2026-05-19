const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    serverUrl: '',
    token: '',
    testing: false,
    statusText: '',
    statusOk: false,
    userInfo: null
  },

  onShow() {
    const settings = wx.getStorageSync('serverSettings') || {}
    this.setData({
      serverUrl: settings.serverUrl || '',
      token: settings.token || ''
    })
  },

  onUrlInput(e) {
    this.setData({ serverUrl: e.detail.value })
  },

  onTokenInput(e) {
    this.setData({ token: e.detail.value })
  },

  /** 测试与服务器的连接 */
  testConnection() {
    const { serverUrl, token } = this.data
    if (!serverUrl) {
      app.showToast('请输入服务器地址')
      return
    }
    if (!token) {
      app.showToast('请输入Token')
      return
    }

    this.setData({ testing: true, statusText: '', statusOk: false, userInfo: null })

    // 临时保存以用于API调用
    app.globalData.serverUrl = serverUrl
    app.globalData.token = token

    api.login(token).then(res => {
      this.setData({ testing: false })
      if (res.data.code === 0) {
        this.setData({
          statusText: '连接成功',
          statusOk: true
        })
        // 获取用户信息
        return api.getUserInfo()
      } else {
        this.setData({
          statusText: res.data.msg || 'Token验证失败',
          statusOk: false
        })
      }
    }).then(userRes => {
      if (userRes && userRes.data.code === 0) {
        this.setData({ userInfo: userRes.data.data.user })
      }
    }).catch(err => {
      this.setData({
        testing: false,
        statusText: err.msg || '连接失败',
        statusOk: false
      })
    })
  },

  /** 保存配置 */
  saveSettings() {
    const { serverUrl, token } = this.data
    if (!serverUrl) {
      app.showToast('请输入服务器地址')
      return
    }
    if (!token) {
      app.showToast('请输入Token')
      return
    }

    const settings = { serverUrl: serverUrl.replace(/\/+$/, ''), token }
    wx.setStorageSync('serverSettings', settings)
    app.globalData.serverUrl = settings.serverUrl
    app.globalData.token = settings.token
    app.showToast('保存成功', 'success')
  },

  openDoc() {
    wx.setClipboardData({
      data: 'https://fastposter.net/doc/',
      success() {
        app.showToast('链接已复制，请在浏览器打开', 'success')
      }
    })
  }
})
