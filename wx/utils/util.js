/**
 * 工具函数
 */

/** 格式化时间 */
function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hour = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${year}-${month}-${day} ${hour}:${min}`
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

/** 从海报JSON中提取动态变量列表 */
function extractVariables(posterJson) {
  try {
    const data = typeof posterJson === 'string' ? JSON.parse(posterJson) : posterJson
    const items = data.items || []
    const variables = []
    items.forEach((item, index) => {
      if (item.vd) {
        variables.push({
          name: item.vd,
          type: item.t,
          defaultValue: item.v || '',
          index
        })
      }
    })
    return variables
  } catch (e) {
    return []
  }
}

/** 获取海报预览图URL */
function getPreviewUrl(baseUrl, path) {
  if (!baseUrl || !path) return ''
  const url = baseUrl.replace(/\/+$/, '')
  return `${url}/${path.replace(/^\//, '')}`
}

/** 复制文本到剪贴板 */
function copyText(text) {
  wx.setClipboardData({ data: text })
}

/** 图片错误处理 */
function handleImageError(e) {
  const target = e.target || e.currentTarget
  // 可替换为默认占位图
}

module.exports = {
  formatTime,
  extractVariables,
  getPreviewUrl,
  copyText,
  handleImageError
}
