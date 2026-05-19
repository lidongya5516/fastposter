# fastposter API 文档

## 基础信息

### 服务器地址

```
http://your-server:5000
```

### 认证方式

所有需要认证的接口需在请求中携带 `token`，支持以下方式传递：

1. **HTTP Header**: `token: your-token`
2. **Query 参数**: `?token=your-token`
3. **Body 参数**（POST/PUT）: `token=your-token`

> token 通过 `app.yml` 或命令行参数 `-t` 设置。

### 响应格式

所有 API 返回 JSON 格式：

```json
{
  "code": 0,
  "msg": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 0 成功，400 请求错误，401 认证失败 |
| msg | string | 提示信息 |
| data | object | 业务数据 |

### 图片格式

支持输出格式：`jpeg`、`png`、`webp`、`pdf`、`base64`

---

## 1. 登录认证

验证 token 是否有效。

```
POST /api/login
```

**请求体：**

```json
{
  "token": "your-token"
}
```

**响应示例：**

```json
{
  "code": 0,
  "msg": "login success.",
  "data": {
    "token": "your-token"
  }
}
```

---

## 2. 获取用户信息

```
GET /api/user/info
```

**响应示例：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 2,
      "username": "user1",
      "type": 1,
      "status": 1
    }
  }
}
```

---

## 3. 海报管理

### 3.1 获取海报列表

```
GET /api/user/posters
```

**响应示例：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "posters": [
      {
        "id": 1,
        "code": "6fba72004fa20aee",
        "name": "我的海报",
        "preview": "store/preview/20260514/abc.jpg",
        "json": "{...}",
        "createTime": "2026-05-14 10:00:00",
        "updateTime": "2026-05-14 12:00:00"
      }
    ]
  }
}
```

### 3.2 获取单个海报

```
GET /api/user/poster/{id}
```

**响应示例：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "poster": {
      "id": 1,
      "code": "6fba72004fa20aee",
      "name": "我的海报",
      "preview": "store/preview/...",
      "json": "{...}",
      "createTime": "2026-05-14 10:00:00",
      "updateTime": "2026-05-14 12:00:00",
      "status": 1
    }
  }
}
```

### 3.3 创建/更新海报

```
POST /api/user/posters
```

**请求体：**

```json
{
  "id": 0,
  "name": "我的海报",
  "json": "{...}",
  "quality": 80
}
```

> 说明：
> - `id=0` 创建新海报，`id>0` 更新已有海报
> - `json` 是海报的完整 JSON 配置（见下文海报 JSON 格式）
> - `quality` 为图片质量（1-100）

**海报 JSON 格式：**

```json
{
  "w": 1680,
  "h": 1185,
  "bgc": "#ffffff",
  "bgUrl": "",
  "type": "jpeg",
  "quality": 80,
  "items": [
    {
      "t": "text",
      "v": "文本内容",
      "w": 300,
      "h": 50,
      "x": 100,
      "y": 100,
      "s": 30,
      "c": "#000000",
      "fn": "",
      "vd": "",
      "rotate": 0,
      "al": "left",
      "av": "top"
    },
    {
      "t": "image",
      "v": "https://example.com/image.jpg",
      "w": 200,
      "h": 200,
      "x": 100,
      "y": 200,
      "rotate": 0
    },
    {
      "t": "avatar",
      "v": "https://example.com/avatar.jpg",
      "w": 80,
      "h": 80,
      "x": 100,
      "y": 400,
      "c": "#888888",
      "rotate": 0
    },
    {
      "t": "qrcode",
      "v": "https://example.com",
      "w": 150,
      "h": 150,
      "x": 100,
      "y": 500,
      "rotate": 0
    }
  ]
}
```

**元素类型说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `t` | string | 元素类型：`text`、`image`、`avatar`、`qrcode` |
| `v` | string | 值（文本内容 / 图片URL / 二维码内容） |
| `x`, `y` | int | 左上角坐标 |
| `w`, `h` | int | 宽高 |
| `rotate` | int | 旋转角度（0-360），顺时针 |
| `vd` | string | 动态变量名，用于 SDK 调用时替换 `v` 的值 |

**text 元素特有字段：**

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `s` | int | 字体大小 | 24 |
| `c` | string | 文字颜色（十六进制） | `#010203` |
| `fn` | string | 字体文件名（位于 `resource/fonts/`） | 使用默认字体 |
| `al` | string | 水平对齐：`left`、`center`、`right` | `left` |
| `av` | string | 垂直对齐：`top`、`center`、`bottom` | `top` |

**avatar 元素特有字段：**

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `c` | string | 边框颜色 | `#ffffff` |

**qrcode 元素特有字段：**

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `c` | string | 二维码颜色 | `#010203` |
| `p` | int | 边框留白 | 0 |

> 若 `qrcode` 元素的 `v` 值以 `img:` 开头（如 `img:https://...`），则按图片方式渲染。

### 3.4 删除海报

```
DELETE /api/user/posters/{id}
```

（逻辑删除，将状态标记为已删除）

**响应：**

```json
{ "code": 0, "msg": "success", "data": {} }
```

### 3.5 复制海报

```
POST /api/user/posters/copy/{id}
```

**响应：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": 2
  }
}
```

---

## 4. 预览海报

```
POST /api/preview
```

**请求体：** 完整的海报 JSON（参考上面的海报 JSON 格式）

**响应：** 图片二进制流（Content-Type: `image/jpeg`、`image/png` 等）

---

## 5. 上传图片

```
POST /api/upload
```

**请求体：** `multipart/form-data` 格式

| 字段 | 类型 | 说明 |
|------|------|------|
| file | file | 要上传的图片文件 |

**响应示例：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "url": "store/upload/20260514/abc123.png"
  }
}
```

> 返回的 `url` 路径可直接用作 `image`、`avatar` 元素的 `v` 值。

---

## 6. 生成分享链接

```
POST /api/link
```

**请求体：**

```json
{
  "id": 1,
  "posterId": 1
}
```

**响应示例：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "url": "http://your-server:5000/v/abc123"
  }
}
```

---

## 7. 构建海报（SDK 方式）

通过变量替换动态生成海报，适合后端 SDK 调用。

```
POST /v1/build/poster
```

**请求头：**

```
token: your-token
Content-Type: application/json
```

**请求体：**

```json
{
  "uuid": "海报的code值",
  "payload": "{\"变量名\":\"变量值\"}",
  "b64": false
}
```

**参数说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `uuid` | string | 是 | 海报的唯一标识（`code` 字段） |
| `payload` | string | 是 | JSON 字符串，包含要替换的变量名和值 |
| `b64` | boolean | 否 | 是否返回 base64 编码的图片 |

> `payload` 中每个 key 对应海报元素的 `vd`（变量定义），value 会替换该元素的 `v` 值。

**响应：**

- 当 `b64=false`（默认）：返回图片二进制流
- 当 `b64=true`：返回 base64 编码的图片字符串

### 调用示例

**Python：**

```python
import requests
import json

token = 'your-token'
server_url = 'http://127.0.0.1:5000'

response = requests.post(
    f'{server_url}/v1/build/poster',
    headers={
        'token': token,
        'Content-Type': 'application/json'
    },
    json={
        'uuid': '6fba72004fa20aee',
        'payload': json.dumps({
            '名称': '产品名称',
            '价格': '¥99.00'
        })
    }
)

with open('poster.jpg', 'wb') as f:
    f.write(response.content)
```

**cURL：**

```bash
curl -X POST http://127.0.0.1:5000/v1/build/poster \
  -H "token: your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "6fba72004fa20aee",
    "payload": "{\"名称\":\"产品名称\",\"价格\":\"¥99.00\"}"
  }' \
  --output poster.jpg
```

**Java：**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpClient client = HttpClient.newHttpClient();
String json = "{\"uuid\":\"6fba72004fa20aee\",\"payload\":\"{\\\"名称\\\":\\\"产品名称\\\"}\"}";

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("http://127.0.0.1:5000/v1/build/poster"))
    .header("token", "your-token")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();

client.send(request, HttpResponse.BodyHandlers.ofFile(Paths.get("poster.jpg")));
```

**Go：**

```go
package main

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
    "os"
)

func main() {
    body := map[string]interface{}{
        "uuid": "6fba72004fa20aee",
        "payload": `{"名称":"产品名称","价格":"¥99.00"}`,
    }
    jsonData, _ := json.Marshal(body)

    req, _ := http.NewRequest("POST", "http://127.0.0.1:5000/v1/build/poster",
        bytes.NewBuffer(jsonData))
    req.Header.Set("token", "your-token")
    req.Header.Set("Content-Type", "application/json")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()

    out, _ := os.Create("poster.jpg")
    io.Copy(out, resp.Body)
}
```

**PHP：**

```php
<?php
$ch = curl_init('http://127.0.0.1:5000/v1/build/poster');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'token: your-token',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'uuid' => '6fba72004fa20aee',
        'payload' => json_encode([
            '名称' => '产品名称',
            '价格' => '¥99.00'
        ])
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$imageData = curl_exec($ch);
file_put_contents('poster.jpg', $imageData);
```

**JavaScript (Node.js)：**

```javascript
const https = require('https');

const data = JSON.stringify({
  uuid: '6fba72004fa20aee',
  payload: JSON.stringify({ 名称: '产品名称', 价格: '¥99.00' })
});

const req = https.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/v1/build/poster',
  method: 'POST',
  headers: {
    'token': 'your-token',
    'Content-Type': 'application/json'
  }
}, (res) => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    require('fs').writeFileSync('poster.jpg', Buffer.concat(chunks));
  });
});
req.write(data);
req.end();
```

---

## 8. 公开查看分享的海报

```
GET /v/{code}.{format}
```

| 参数 | 说明 |
|------|------|
| `code` | 分享码 |
| `format` | 可选。`png` 指定输出 PNG，`b64` 返回 base64 |

**示例：**

```bash
# 查看分享的海报
curl http://127.0.0.1:5000/v/abc123

# 指定 PNG 格式
curl http://127.0.0.1:5000/v/abc123.png

# 获取 base64 编码
curl http://127.0.0.1:5000/v/abc123.b64
```

---

## 完整 API 路由表

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/login` | 否 | 登录认证 |
| GET | `/api/user/info` | 是 | 获取用户信息 |
| GET | `/api/user/posters` | 是 | 获取海报列表 |
| POST | `/api/user/posters` | 是 | 创建/更新海报 |
| DELETE | `/api/user/posters/{id}` | 是 | 删除海报 |
| POST | `/api/user/posters/copy/{id}` | 是 | 复制海报 |
| GET | `/api/user/poster/{id}` | 是 | 获取单个海报 |
| POST | `/api/preview` | 是 | 预览/渲染海报 |
| POST | `/api/upload` | 是 | 上传图片 |
| POST | `/api/link` | 是 | 创建分享链接 |
| POST | `/v1/build/poster` | 是 | 构建海报（SDK） |
| GET | `/v/{code}` | 否 | 公开查看分享海报 |
| GET | `/(.*)` | 否 | 管理后台前端页面 |

## 错误码说明

| code | 含义 |
|------|------|
| 0 | 成功 |
| 400 | 请求错误（参数错误、海报不存在等） |
| 401 | token 认证失败或已过期 |
