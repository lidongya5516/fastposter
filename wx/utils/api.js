const app = getApp()

const BASE_URL = ''

function getBaseUrl() {
  const url = app.getServerUrl()
  if (!url) return ''
  return url.replace(/\/+$/, '')
}

function request(method, path, data, header = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl()
    if (!baseUrl) {
      reject({ msg: '请先在设置中配置服务器地址和Token' })
      return
    }

    const token = app.getToken()
    const url = `${baseUrl}${path}`
    const headers = { ...header }
    if (token) headers['token'] = token

    wx.request({
      url,
      method,
      data,
      header: headers,
      success(res) {
        if (res.statusCode === 401) {
          reject({ msg: 'Token无效或已过期，请在设置中重新配置' })
          return
        }
        resolve(res)
      },
      fail(err) {
        reject({ msg: '网络请求失败，请检查服务器地址', err })
      }
    })
  })
}

module.exports = {

  /** 1. 登录验证Token */
  login(token) {
    return request('POST', '/api/login', { token })
  },

  /** 2. 获取用户信息 */
  getUserInfo() {
    return request('GET', '/api/user/info')
  },

  /** 3.1 获取海报列表 */
  getPosters() {
    return request('GET', '/api/user/posters')
  },

  /** 3.2 获取单个海报 */
  getPoster(id) {
    return request('GET', `/api/user/poster/${id}`)
  },

  /** 3.3 创建/更新海报 */
  savePoster(data) {
    return request('POST', '/api/user/posters', data)
  },

  /** 3.4 删除海报 */
  deletePoster(id) {
    return request('DELETE', `/api/user/posters/${id}`)
  },

  /** 3.5 复制海报 */
  copyPoster(id) {
    return request('POST', `/api/user/posters/copy/${id}`)
  },

  /** 4. 预览海报（返回图片二进制） */
  previewPoster(posterJson) {
    const baseUrl = getBaseUrl()
    if (!baseUrl) return Promise.reject({ msg: '请先配置服务器地址' })
    return new Promise((resolve, reject) => {
      const token = app.getToken()
      wx.request({
        url: `${baseUrl}/api/preview`,
        method: 'POST',
        data: posterJson,
        header: {
          'token': token,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        success(res) {
          if (res.statusCode === 401) {
            reject({ msg: 'Token无效' })
            return
          }
          const base64 = wx.arrayBufferToBase64(res.data)
          const contentType = res.header['Content-Type'] || 'image/jpeg'
          resolve(`data:${contentType};base64,${base64}`)
        },
        fail(err) {
          reject({ msg: '生成失败', err })
        }
      })
    })
  },

  /** 5. 上传图片 */
  uploadImage(filePath) {
    const baseUrl = getBaseUrl()
    const token = app.getToken()
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${baseUrl}/api/upload`,
        filePath,
        name: 'file',
        header: { token },
        success(res) {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 0) resolve(data.data)
            else reject({ msg: data.msg })
          } catch (e) {
            reject({ msg: '上传失败' })
          }
        },
        fail(err) {
          reject({ msg: '上传失败', err })
        }
      })
    })
  },

  /** 6. 创建分享链接 */
  createShareLink(posterId) {
    return request('POST', '/api/link', { posterId, id: posterId })
  },

  /** 7. 构建海报（SDK方式 — 变量替换） */
  buildPoster(uuid, payload, b64 = true) {
    return new Promise((resolve, reject) => {
      const baseUrl = getBaseUrl()
      const token = app.getToken()
      if (!baseUrl) {
        reject({ msg: '请先配置服务器地址' })
        return
      }
      wx.request({
        url: `${baseUrl}/v1/build/poster`,
        method: 'POST',
        data: {
          uuid,
          payload: JSON.stringify(payload),
          b64
        },
        header: {
          'token': token,
          'Content-Type': 'application/json'
        },
        responseType: b64 ? 'text' : 'arraybuffer',
        success(res) {
          if (res.statusCode === 401) {
            reject({ msg: 'Token无效' })
            return
          }
          if (b64) {
            // API返回纯base64，需加data URI前缀才能在image中显示
            const base64 = res.data
            const hasPrefix = base64.startsWith('data:')
            resolve(hasPrefix ? base64 : `data:image/jpeg;base64,${base64}`)
          } else {
            const base64 = wx.arrayBufferToBase64(res.data)
            resolve(`data:image/jpeg;base64,${base64}`)
          }
        },
        fail(err) {
          reject({ msg: '生成失败', err })
        }
      })
    })
  },

  /** 8. 获取公开分享海报 */
  getSharePoster(code) {
    const baseUrl = getBaseUrl()
    if (!baseUrl) return Promise.reject({ msg: '请先配置服务器地址' })
    return `${baseUrl}/v/${code}`
  },

  /** 获取海报全尺寸预览图URL */
  getPreviewUrl(path) {
    const baseUrl = getBaseUrl()
    if (!baseUrl || !path) return ''
    return `${baseUrl}/${path}`
  }
}
