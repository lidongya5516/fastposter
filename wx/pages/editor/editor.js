const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    poster: null,
    posterJson: null,
    variables: [],
    loading: true,
    generating: false,
    posterId: null,
    posterCode: null,
    previewError: false
  },

  typeLabels: { text: '文本', image: '图片', avatar: '头像', qrcode: '二维码' },
  typePlaceholders: {
    text: '请输入{name}',
    image: '输入图片URL或点击上传图片',
    avatar: '输入头像URL或点击上传头像',
    qrcode: '输入二维码链接内容'
  },

  onLoad(options) {
    const { id, code } = options
    this.setData({ posterId: id, posterCode: code })
    this.loadPosterDetail(id)
  },

  loadPosterDetail(id) {
    this.setData({ loading: true })
    api.getPoster(id).then(res => {
      if (res.data.code === 0) {
        const poster = res.data.data.poster
        const previewUrl = poster.preview
          ? util.getPreviewUrl(app.getServerUrl(), poster.preview)
          : ''

        let posterJson = null
        try { posterJson = JSON.parse(poster.json) } catch (e) {}

        // 解析动态变量，每个变量附带类型标签、占位文本和默认值
        const rawVars = util.extractVariables(poster.json)
        const variables = rawVars.map(v => ({
          ...v,
          value: v.defaultValue,
          typeLabel: this.typeLabels[v.type] || v.type,
          placeholder: this.getPlaceholder(v)
        }))

        this.setData({
          poster: { ...poster, previewUrl },
          posterJson,
          variables,
          loading: false
        })
      } else {
        app.showToast(res.data.msg || '加载失败')
        wx.navigateBack()
      }
    }).catch(err => {
      app.showToast(err.msg || '加载失败')
      this.setData({ loading: false })
    })
  },

  /** 根据类型生成占位文本 */
  getPlaceholder(v) {
    const base = this.typePlaceholders[v.type]
    if (!base) return `请输入${v.name}`
    return base.replace('{name}', v.name)
  },

  /** 预览图加载失败 */
  onPreviewError() {
    this.setData({ previewError: true })
  },

  /** 变量值输入 */
  onVarInput(e) {
    const { index } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({ [`variables[${index}].value`]: value })
  },

  /** 上传图片 */
  onUploadImage(e) {
    const { index } = e.currentTarget.dataset
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        app.showLoading('上传中...')

        api.uploadImage(tempPath).then(data => {
          app.hideLoading()
          if (data && data.url) {
            this.setData({ [`variables[${index}].value`]: data.url })
            app.showToast('上传成功', 'success')
          } else {
            app.showToast('上传返回数据异常')
          }
        }).catch(err => {
          app.hideLoading()
          app.showToast(err.msg || '上传失败')
        })
      },
      fail: () => {
        // 用户取消选择，不做提示
      }
    })
  },

  /** 预览海报——发送完整JSON到服务器渲染 */
  previewPoster() {
    this.setData({ generating: true })
    app.showLoading('渲染中...')

    const posterJson = this.buildPosterJson()
    if (!posterJson) {
      app.hideLoading()
      app.showToast('海报数据异常')
      this.setData({ generating: false })
      return
    }

    api.previewPoster(posterJson).then(base64 => {
      app.hideLoading()
      this.setData({ generating: false })
      this.navigateToGenerate(base64, 'preview')
    }).catch(err => {
      app.hideLoading()
      app.showToast(err.msg || '渲染失败')
      this.setData({ generating: false })
    })
  },

  /** 生成海报——通过SDK方式变量替换 */
  generatePoster() {
    const { poster, variables } = this.data
    if (!poster) return

    // 检查是否有未填写的必填变量
    const emptyVars = variables.filter(v => !v.value && v.defaultValue === '')
    if (emptyVars.length > 0) {
      wx.showModal({
        title: '提示',
        content: `还有 ${emptyVars.length} 个变量未填写，是否继续生成？`,
        success: (res) => {
          if (res.confirm) this.doGenerate(poster)
        }
      })
      return
    }
    this.doGenerate(poster)
  },

  doGenerate(poster) {
    this.setData({ generating: true })
    app.showLoading('生成中...')

    const payload = {}
    this.data.variables.forEach(v => {
      payload[v.name] = v.value || v.defaultValue
    })

    api.buildPoster(poster.code, payload, true).then(base64 => {
      app.hideLoading()
      this.setData({ generating: false })
      this.navigateToGenerate(base64, 'build')
    }).catch(err => {
      app.hideLoading()
      app.showToast(err.msg || '生成失败')
      this.setData({ generating: false })
    })
  },

  /** 跳转到预览页并传递图片数据 */
  navigateToGenerate(base64, type) {
    wx.navigateTo({
      url: `/pages/generate/generate?posterId=${this.data.posterId}&posterName=${encodeURIComponent(this.data.poster.name)}&type=${type}`,
      success: (page) => {
        page.eventChannel.emit('posterImage', { image: base64 })
      }
    })
  },

  /** 返回首页 */
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  /** 构建已替换变量的完整海报JSON（用于预览API） */
  buildPosterJson() {
    const { poster, variables } = this.data
    try {
      const data = JSON.parse(poster.json)
      data.items = data.items.map(item => {
        if (item.vd) {
          const found = variables.find(v => v.name === item.vd)
          if (found && found.value) {
            item.v = found.value
          }
        }
        return item
      })
      return data
    } catch (e) {
      return null
    }
  }
})
