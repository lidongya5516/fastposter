const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    imageSrc: '',
    shareUrl: '',
    posterId: null,
    posterName: '',
    generateType: 'build',
    saving: false
  },

  onLoad(options) {
    const { posterId, posterName, type } = options
    this.setData({
      posterId: posterId || '',
      posterName: decodeURIComponent(posterName || ''),
      generateType: type || 'build'
    })

    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('posterImage', (data) => {
      this.setData({ imageSrc: data.image })
    })
  },

  /** 保存到相册 */
  saveToAlbum() {
    const { imageSrc } = this.data
    if (!imageSrc || this.data.saving) return

    this.setData({ saving: true })
    app.showLoading('保存中...')

    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/poster_${Date.now()}.jpg`
    const base64Data = imageSrc.replace(/^data:image\/\w+;base64,/, '')

    // 先写临时文件，再保存到相册
    fs.writeFile({
      filePath,
      data: base64Data,
      encoding: 'base64',
      success: () => {
        wx.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            app.hideLoading()
            app.showToast('已保存到相册', 'success')
            this.setData({ saving: false })
          },
          fail: (err) => {
            this.setData({ saving: false })
            app.hideLoading()
            if (err.errMsg && err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '需要权限',
                content: '保存到相册需要授权，是否前往设置开启？',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
            } else {
              app.showToast('保存失败，请重试')
            }
          }
        })
      },
      fail: () => {
        this.setData({ saving: false })
        app.hideLoading()
        app.showToast('保存失败')
      }
    })
  },

  /** 创建分享链接 */
  createShareLink() {
    if (!this.data.posterId) {
      app.showToast('海报信息缺失')
      return
    }
    app.showLoading('生成链接中...')
    api.createShareLink(this.data.posterId).then(res => {
      app.hideLoading()
      if (res.data.code === 0) {
        this.setData({ shareUrl: res.data.data.url })
        app.showToast('分享链接已生成', 'success')
      } else {
        app.showToast(res.data.msg || '生成失败')
      }
    }).catch(err => {
      app.hideLoading()
      app.showToast(err.msg || '生成失败')
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.posterName || 'FastPoster 海报',
      path: '/pages/index/index',
      imageUrl: this.data.imageSrc
    }
  },

  /** 图片加载失败 */
  onImageError() {
    app.showToast('图片加载失败，请重新生成')
  },

  copyLink() {
    util.copyText(this.data.shareUrl)
    app.showToast('已复制', 'success')
  },

  goBack() {
    wx.navigateBack()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
