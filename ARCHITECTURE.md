# fastposter 项目学习文档

## 一、项目概述

fastposter 是一个**海报生成器**，用户通过拖拽方式在网页上设计海报模板，后端根据 JSON 配置渲染出最终图片。项目的核心价值在于：**将复杂的绘图逻辑抽象为可复用的 JSON 配置，让非技术人员也能生成高质量海报**。

### 适用场景

- 电商商品主图自动生成
- 朋友圈分享海报
- 证书/奖状自动生成
- 二维码分享海报
- 营销推广图批量生成

---

## 二、架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (Vue.js SPA)                      │
│  编辑器画布 + 属性面板 + 图层管理 + 代码生成               │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP API
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  后端 (Python Tornado)                    │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────────┐ │
│  │ 路由层   │→ │ 业务层    │→ │ 渲染引擎 (Pillow)        │ │
│  │ fast.py │  │ dao.py   │  │ poster.py               │ │
│  └─────────┘  └────┬─────┘  └─────────────────────────┘ │
│                    │                                     │
│              ┌─────▼──────┐                              │
│              │ SQLite     │                              │
│              │ data/db/   │                              │
│              └────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

### 分层职责

| 层级 | 文件 | 职责 |
|------|------|------|
| **配置层** | `C.py` | 全局配置、Token 认证、路径管理 |
| **路由层** | `fast.py` | Tornado HTTP 路由、请求分发 |
| **业务层** | `dao.py` | SQLite 数据库操作、JSON 数据管理 |
| **渲染层** | `poster.py` | Pillow 图片渲染引擎 |
| **存储层** | `store.py` | 文件上传存储 |
| **响应层** | `R.py` | 统一 JSON 响应格式 |
| **前端** | `static/` | Vue.js 编译后的 SPA 编辑器 |

---

## 三、核心数据模型

### 海报 JSON 结构

```json
{
  "w": 1680,          // 画布宽度
  "h": 1185,          // 画布高度
  "bgc": "#ffffff",   // 背景颜色
  "bgUrl": "",        // 背景图片 URL
  "type": "jpeg",     // 输出格式
  "quality": 80,      // 图片质量
  "items": [          // 元素列表（按 z-index 排序）
    {
      "t": "text",    // 元素类型: text/image/avatar/qrcode
      "v": "内容",    // 值（文本/URL）
      "x": 100,       // 左上角 X 坐标
      "y": 200,       // 左上角 Y 坐标
      "w": 300,       // 宽度
      "h": 50,        // 高度
      "rotate": 0,    // 旋转角度（顺时针）
      "vd": "",       // 动态变量名（用于替换）
      // text 特有字段
      "s": 30,        // 字体大小
      "c": "#000000", // 颜色
      "fn": "",       // 字体文件名
      "al": "left",   // 水平对齐: left/center/right
      "av": "top",    // 垂直对齐: top/center/bottom
      // avatar 特有字段
      // "c": "#ffffff"  // 边框颜色
      // qrcode 特有字段
      // "p": 0          // 边框留白
    }
  ]
}
```

### 关键设计思路

**为什么用 JSON 而不是直接调绘图 API？**

将海报设计抽象为 JSON 配置，带来几个好处：

1. **持久化** — JSON 可存入数据库，随时复用
2. **前后端一致** — 前端根据 JSON 渲染预览，后端根据 JSON 渲染最终图，同一套数据
3. **动态替换** — 通过 `vd` 字段标记可替换变量，SDK 调用时传参覆盖，实现"模板 + 数据"模式
4. **可编辑** — JSON 结构化，前端编辑器可直接操作

---

## 四、渲染引擎详解

### 渲染流程

```
接收 JSON → 创建背景画布 → 遍历 items 按类型分发 → 各元素绘制 → 格式转换 → 输出图片
```

```
poster.draw(data)
  │
  ├── drawBg(data)          ← 创建背景：纯色或图片
  │
  └── for each item:
      ├── text  → drawText()    ← 文本：换行、对齐、旋转
      ├── image → drawImg()     ← 图片：缩放、旋转
      ├── avatar→ drawAvatar()  ← 头像：圆形裁剪、边框
      └── qrcode→ drawQrCode() ← 二维码：生成、渲染
```

### 文本渲染（drawText）

最复杂的元素，涉及：

```
创建透明层 (w×h) → 文字换行 → 计算对齐偏移 → 绘制文本 → 旋转 → 粘贴到画布
```

**换行算法**（`wrap_text`）：逐字符累加，当宽度超过容器宽度时折行。支持 `\n` 强制换行。

**对齐计算**：通过 `getbbox()` 测量文本精确宽度，根据 `al`（left/center/right）和 `av`（top/center/bottom）计算偏移量。

### 图片加载（fetchImg）

```
URL 以 "store/upload/" 开头 → 从本地磁盘加载
否则 → HTTP 请求下载（带 200ms 超时）
失败 → 使用默认占位图
```

### 旋转（rotate_element）

所有元素共享同一旋转逻辑：

1. 在透明层上绘制元素
2. 对整个层执行 `rotate(-angle, expand=True, center=(w/2, h/2))`
3. 计算扩展后的位置偏移
4. 调整 `x, y` 坐标后粘贴到画布

> 负角度因为 PIL 默认逆时针而 CSS `transform: rotate()` 是顺时针，取反保持两个环境一致。

---

## 五、前后端交互

### 数据流

```
编辑器操作 → Vuex 状态更新 → json getter 序列化 → HTTP 请求 → 后端存储/渲染 → 返回结果
```

### 预览流程

1. 用户点击"预览"
2. 前端通过 `json` getter 将 Vuex 中的海报状态序列化为 JSON 字符串
3. POST 到 `/api/preview`
4. 后端 `json.loads()` 解析，调用 `poster.drawio()` 渲染
5. 返回图片二进制流，前端显示

### 动态变量替换流程

```python
# dao.py - merge_params 核心逻辑
d = json.loads(poster_json)           # 从数据库加载海报模板
for item in d['items']:
    if item['vd']:                     # 元素有变量定义
        if param.get(item['vd']):      # 请求参数中有对应值
            item['v'] = param[item['vd']]  # 替换
return d                               # 返回渲染数据
```

这种"模板 + 参数"的设计是项目最巧妙的部分：一份海报设计可以对应无数种输出。

---

## 六、数据存储

### SQLite 表结构

```sql
-- 海报表（逻辑删除）
posters (id, code, name, preview, json, create_time, update_time, status)

-- 分享链接表
links   (id, code, pid, params, create_time)
```

- `code` — 唯一标识（MD5 + UUID 截断），用作 API 调用的标识
- `json` — 完整的海报 JSON，数据库不关心结构，直接存取
- `status` — 1=正常，2=已删除（软删除）
- `links.params` — 分享时携带的查询参数

### 文件存储

```
data/store/
├── upload/YYYYMMDD/    ← 上传的图片
└── preview/YYYYMMDD/   ← 自动生成的预览缩略图
```

按日期组织 + 随机文件名，避免冲突。

---

## 七、开发流程

### 1. 本地开发

```bash
# 启动
python fast.py

# 代码结构
fast.py           # 路由和 Handler（约 230 行）
poster.py         # 渲染引擎（约 240 行）
dao.py            # 数据库操作（约 220 行）
C.py              # 配置（约 80 行）
R.py              # 响应工具（约 40 行）
store.py          # 文件存储（约 20 行）
app.yml           # 应用配置
```

### 2. 添加新功能的一般步骤

以"给文本元素增加垂直居中"为例，展示了完整流程：

**① 扩展数据模型**
- 在 JSON 元素中加入新字段（如 `av: "center"`）

**② 后端渲染（poster.py）**
- 修改对应的绘制函数，读取新字段并实现效果

**③ 前端预览（static/js 编译后的 Vue）**
- 修改 PosterItem 渲染函数，增加 CSS 样式支持
- 修改 SettingItemBase，增加 UI 控件来设置新字段

**④ 持久化**
- 新字段随 JSON 存入 SQLite，自动持久化
- 在 `addItem` mutation 中为新建元素设置默认值

### 3. 关键设计原则

**"JSON 即接口"**：前端编辑器的输出 = 后端渲染引擎的输入 = 数据库存储的格式，三者统一。

**前后端解耦**：前端是纯 Vue SPA（编译后约 120KB），后端是纯 Python API。理论上可以替换任一端的实现。

**无外部依赖**：SQLite 存储、Pillow 渲染、无 Redis / MySQL / MongoDB，部署简单。

---

## 八、Docker 部署

```bash
# 使用官方镜像
docker run -d --name fastposter -p 5000:5000 \
  -e TOKEN=your-token \
  -v /path/to/data:/app/data \
  fastposter/fastposter
```

或参考 `DOCKER.md` 从源码构建。

---

## 九、技术栈总结

| 技术 | 用途 |
|------|------|
| Python 3 | 后端语言 |
| Tornado 6 | Web 框架 |
| Pillow 9+ | 图片渲染 |
| SQLite 3 | 数据存储 |
| Vue.js 2 | 前端框架 |
| iView | UI 组件库 |
| qrcode | 二维码生成 |
| Docker | 容器化部署 |

---

## 十、学习要点

1. **JSON 驱动的渲染引擎**：理解如何将结构化配置转化为像素输出
2. **Pillow 绘图基础**：ImageDraw、ImageFont、图层合成、rotate
3. **Tornado 路由设计**：RESTful API + StaticFileHandler 混合
4. **前后端分离架构**：Vue SPA + Python API，通过 JSON 交流
5. **SQLite 在小型项目中的运用**：零配置、自动建表、软删除
6. **变量替换模式**：通过 `vd` 字段实现模板参数化
