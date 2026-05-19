# fastposter 在线部署文档

## 环境要求

- Python 3.8+
- pip（Python 包管理器）
- 操作系统：Linux / macOS / Windows

## 快速部署

### 1. 获取代码

```bash
git clone https://github.com/psoho/fast-poster.git
cd fast-poster
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

> 注意：`requirements.txt` 中 Pillow=9.5.0 不支持 Python 3.13，如使用 Python 3.13 请安装 Pillow>=12.0.0。

### 3. 配置认证 Token

编辑 `app.yml` 文件，设置自定义 token：

```yaml
app:
  name: fastposter
  token: your-custom-token-here
```

或通过命令行参数指定：

```bash
python fast.py -t your-custom-token-here
```

### 4. 启动服务

```bash
python fast.py
```

服务默认监听 `0.0.0.0:5000`，启动后访问 `http://your-server-ip:5000` 即可打开管理后台。

## 生产环境部署

### 使用 systemd（Linux）

创建 `/etc/systemd/system/fastposter.service`：

```ini
[Unit]
Description=fastposter Poster Generator
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/fast-poster
ExecStart=/usr/bin/python /opt/fast-poster/fast.py -t your-token
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable fastposter
sudo systemctl start fastposter
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

如需修改 API 路径前缀，设置环境变量 `POSTER_URI_PREFIX`：

```bash
POSTER_URI_PREFIX=http://0.0.0.0:5000/myprefix/ python fast.py
```

## 配置说明

### app.yml

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| app.name | 应用名称 | fastposter |
| app.token | API 认证令牌 | 必填 |

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `POSTER_URI_PREFIX` | 服务 URI 前缀，用于反向代理路径重写 | `http://0.0.0.0:5000/` |
| `POSTER_DEBUG` | 开启 Tornado debug 模式 | `false`（Docker 外默认为 true） |
| `FASTPOSTER_IN_DOCKER` | Docker 环境标识 | 不设置 |

### 目录结构

```
data/
├── db/
│   ├── poster.sqlite      # 海报数据（SQLite）
│   └── cache.sqlite       # HTTP 请求缓存
└── store/
    ├── preview/YYYYMMDD/  # 预览缩略图
    └── upload/YYYYMMDD/   # 上传的图片文件
```

### 端口

- 默认端口：5000（通过 `fast.py` 中的 `PORT` 变量修改）
- 绑定地址：`0.0.0.0`

## 数据持久化

关键数据存储在 `data/` 目录下，备份时需保存：

```bash
# 备份数据库和上传文件
tar -czf fastposter-backup.tar.gz data/
```

## 升级

1. 备份 `data/` 目录和 `app.yml`
2. 拉取最新代码
3. 覆盖安装依赖：`pip install -r requirements.txt --upgrade`
4. 恢复 `app.yml`
5. 重启服务
