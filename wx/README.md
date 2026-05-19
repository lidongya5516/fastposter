# FastPoster 微信小程序

基于 fastposter API 开发的海报制作分享小程序，支持浏览海报模板、填写动态变量、生成海报、保存分享等功能。

## 项目结构

```
wx/
├── app.js                    # 小程序入口、全局状态
├── app.json                  # 全局配置（页面路由、TabBar）
├── app.wxss                  # 全局样式
├── project.config.json       # 微信开发者工具项目配置
│
├── utils/
│   ├── api.js                # API 封装（所有后端接口调用）
│   └── util.js               # 工具函数（格式化、变量提取等）
│
├── pages/
│   ├── index/                # 首页 — 海报模板列表
│   │   ├── index.js
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   │
│   ├── editor/               # 编辑器 — 填写动态变量
│   │   ├── editor.js
│   │   ├── editor.wxml
│   │   ├── editor.wxss
│   │   └── editor.json
│   │
│   ├── generate/             # 预览/生成 — 展示海报结果
│   │   ├── generate.js
│   │   ├── generate.wxml
│   │   ├── generate.wxss
│   │   └── generate.json
│   │
│   └── settings/             # 设置 — 服务器配置与连接测试
│       ├── settings.js
│       ├── settings.wxml
│       ├── settings.wxss
│       └── settings.json
│
└── images/                   # TabBar 图标
    ├── poster.png
    ├── poster_active.png
    ├── settings.png
    ├── settings_active.png
    └── empty.png
```

## 页面功能说明

### 1. 首页 (index)

- 展示从 fastposter 服务端获取的海报模板列表
- 显示海报预览缩略图、名称、更新时间
- 下拉刷新重新加载
- 未配置时提示跳转设置页

### 2. 编辑器 (editor)

- 展示选中海报的预览图和基本信息
- 自动解析海报 JSON 中的动态变量（`vd` 字段）
- 为每个变量提供输入框让用户填写
- 两个核心操作：
  - **预览** — 调用 `/api/preview` 渲染当前变量替换后的海报
  - **生成海报** — 调用 `/v1/build/poster` 通过 SDK 方式生成最终海报

### 3. 预览/生成 (generate)

- 展示生成的海报大图
- 操作：保存到相册、分享给好友、生成分享链接
- 分享链接通过 `/api/link` 创建，其他人可通过公开链接查看

### 4. 设置 (settings)

- 配置 fastposter 服务器地址和 Token
- 测试连接并验证 Token 有效性
- 显示当前登录用户信息
- 配置持久化到本地存储

## FastPoster API 调用方式

所有 API 调用封装在 `utils/api.js` 中，统一处理 Token 认证和错误提示。

| API 路径 | 方法 | 封装函数 | 说明 |
|----------|------|----------|------|
| `/api/login` | POST | `login()` | 验证 Token |
| `/api/user/info` | GET | `getUserInfo()` | 获取用户信息 |
| `/api/user/posters` | GET | `getPosters()` | 获取海报列表 |
| `/api/user/poster/{id}` | GET | `getPoster()` | 获取单个海报 |
| `/api/user/posters` | POST | `savePoster()` | 创建/更新海报 |
| `/api/user/posters/{id}` | DELETE | `deletePoster()` | 删除海报 |
| `/api/user/posters/copy/{id}` | POST | `copyPoster()` | 复制海报 |
| `/api/preview` | POST | `previewPoster()` | 预览海报渲染 |
| `/api/upload` | POST | `uploadImage()` | 上传图片 |
| `/api/link` | POST | `createShareLink()` | 生成分享链接 |
| `/v1/build/poster` | POST | `buildPoster()` | 变量替换生成海报 |

**核心流程：**

```
首页查看列表 → 选择海报 → 填写变量值 → 调用 buildPoster() → 预览/保存/分享
```

## 开发环境配置

### 1. 启动 fastposter 服务

```bash
# 方式一：Docker
docker run -d --name fastposter -p 5000:5000 \
  -e TOKEN=your-token \
  fastposter/fastposter

# 方式二：本地运行
cd fastposter
pip install -r requirements.txt
python fast.py -t your-token
```

### 2. 打开微信开发者工具

1. 打开微信开发者工具
2. 项目路径选择 `wx/` 目录
3. 填写 AppID（或使用测试号）
4. 在"详情 → 本地设置"中勾选"不校验合法域名"

### 3. 配置小程序

1. 运行小程序
2. 进入"设置"页面
3. 填写服务器地址（如 `http://192.168.1.100:5000`）
4. 填写 Token
5. 点击"测试连接"验证

## 发布前注意事项

1. **域名配置**: 微信小程序要求服务器域名需配置为 HTTPS 并在微信公众平台白名单中添加
2. **图片处理**: 从 `/api/preview` 和 `/v1/build/poster` 获取的图片为二进制流，使用 `responseType: 'arraybuffer'` 接收
3. **base64 转换**: 小程序端使用 `wx.arrayBufferToBase64()` 将图片二进制转为 base64 显示
4. **保存相册**: 需要用户授权 `writePhotosAlbum` 权限
