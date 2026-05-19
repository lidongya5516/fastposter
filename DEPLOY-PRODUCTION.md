# FastPoster 本地 Docker 部署指南

基于 `D:\fastposter` 项目源码，通过 Docker 在本地部署 fastposter 服务。

---

## 目录

1. [环境要求](#1-环境要求)
2. [安装 Docker Desktop](#2-安装-docker-desktop)
3. [构建 Docker 镜像](#3-构建-docker-镜像)
4. [启动容器](#4-启动容器)
5. [验证部署](#5-验证部署)
6. [数据持久化](#6-数据持久化)
7. [Docker Compose 部署](#7-docker-compose-部署)
8. [常用管理命令](#8-常用管理命令)
9. [微信小程序对接](#9-微信小程序对接)
10. [故障排查](#10-故障排查)

---

## 1. 环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11（推荐专业版或企业版） |
| Docker | Docker Desktop 4.x+ |
| WSL 2 | Windows Subsystem for Linux 2（Docker Desktop 依赖） |
| 磁盘空间 | 至少 2GB（镜像 + 数据） |

### 确认 Docker 已安装

打开 PowerShell 或 CMD，运行：

```bash
docker --version
docker compose version
```

如果显示版本号说明已安装，可跳过第 2 章。

---

## 2. 安装 Docker Desktop

### 2.1 下载安装包

访问 [Docker Desktop 官方下载页](https://www.docker.com/products/docker-desktop/) 下载 Windows 版本。

### 2.2 安装步骤

1. 双击运行 `Docker Desktop Installer.exe`
2. 勾选 **"Use WSL 2 instead of Hyper-V"**（推荐）
3. 点击 OK 开始安装
4. 安装完成后重启电脑

### 2.3 启用 WSL 2（如未启用）

以管理员身份打开 PowerShell，运行：

```powershell
wsl --install
```

### 2.4 验证安装

```bash
docker run hello-world
```

看到欢迎信息即安装成功。

---

## 3. 构建 Docker 镜像

从本地源码构建镜像（不使用官方远程镜像）。

### 3.1 确认项目文件

确保项目根目录 `D:\fastposter` 包含以下文件：

```
D:\fastposter/
├── fast.py           # 主程序
├── poster.py         # 渲染引擎
├── dao.py            # 数据库操作
├── C.py              # 配置
├── R.py              # 响应工具
├── store.py          # 文件存储
├── app.yml           # 应用配置
├── requirements.txt  # Python 依赖
├── static/           # 前端静态文件
└── resource/         # 资源文件
```

### 3.2 创建 Dockerfile

在 `D:\fastposter` 目录下创建 `Dockerfile`：

```dockerfile
# 使用 Python 3.11 精简镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（Pillow 所需）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY . .

# 创建数据目录
RUN mkdir -p data/db data/store

# 暴露端口
EXPOSE 5000

# 设置 Docker 环境标识
ENV FASTPOSTER_IN_DOCKER=1

# 启动服务
CMD ["python", "fast.py"]
```

### 3.3 创建 .dockerignore

在 `D:\fastposter` 目录下创建 `.dockerignore`：

```dockerignore
__pycache__/
*.pyc
*.pyo
.env
.git/
.claude/
.claude/
wx/
node_modules/
data/
test/
test_*.png
*.md
Dockerfile
.dockerignore
```

### 3.4 构建镜像

在 `D:\fastposter` 目录下执行：

```bash
cd D:\fastposter

# 构建镜像，标签为 fastposter:local
docker build -t fastposter:local .
```

> 首次构建需要下载基础镜像，耗时约 3-5 分钟。后续构建使用缓存，只需几秒。

### 3.5 查看已构建的镜像

```bash
docker images | grep fastposter
```

输出示例：

```
REPOSITORY     TAG       IMAGE ID       CREATED          SIZE
fastposter     local     a1b2c3d4e5f6   10 seconds ago   250MB
```

---

## 4. 启动容器

### 4.1 生成强 Token

```bash
# 方式一：使用 Python
python -c "import secrets; print(secrets.token_hex(32))"

# 方式二：使用 openssl（如已安装）
openssl rand -hex 32
```

或直接使用项目已有的 Token（来自 `app.yml`）：

```
ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv
```

### 4.2 启动容器

```bash
docker run -d \
  --name fastposter \
  --restart unless-stopped \
  -p 5000:5000 \
  -e TOKEN="ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv" \
  -v D:/fastposter/data:/app/data \
  fastposter:local
```

**参数说明：**

| 参数 | 含义 |
|------|------|
| `-d` | 后台运行 |
| `--name fastposter` | 容器名称 |
| `--restart unless-stopped` | 异常退出自动重启 |
| `-p 5000:5000` | 映射主机 5000 端口到容器 |
| `-e TOKEN="..."` | 设置 API 认证 Token |
| `-v D:/fastposter/data:/app/data` | 挂载数据目录持久化 |
| `fastposter:local` | 使用本地构建的镜像 |

### 4.3 容器启动后立即查看日志

```bash
docker logs fastposter
```

看到如下输出即启动成功：

```
TOKEN ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv
...
fastposter(v2.19.1)
Listening at http://0.0.0.0:5000/
```

---

## 5. 验证部署

### 5.1 打开管理后台

浏览器访问：http://127.0.0.1:5000/

正常显示管理后台页面即前端部署成功。

### 5.2 测试 API

```bash
# 测试登录
curl -s http://127.0.0.1:5000/api/login ^
  -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"token\":\"ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv\"}"

# 预期输出：
# {"code": 0, "msg": "login success.", "data": {"token": "ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv"}}

# 获取海报列表
curl -s http://127.0.0.1:5000/api/user/posters ^
  -H "token: ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv"

# 预期输出：
# {"code": 0, "msg": "success", "data": {"posters": [...]}}
```

### 5.3 查看容器状态

```bash
docker ps -f name=fastposter --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

输出：

```
NAMES         STATUS         PORTS
fastposter    Up 2 minutes   0.0.0.0:5000->5000/tcp
```

---

## 6. 数据持久化

### 6.1 数据存储位置

启动时通过 `-v D:/fastposter/data:/app/data` 挂载了数据目录：

```
D:\fastposter\data\
├── db\
│   ├── poster.sqlite      # 海报数据
│   └── cache.sqlite       # HTTP 请求缓存
└── store\
    ├── preview\YYYYMMDD\  # 预览缩略图
    └── upload\YYYYMMDD\   # 上传的图片
```

### 6.2 备份数据

```powershell
# 备份整个 data 目录
tar -czf D:\fastposter\backup\fastposter-data-%date:~0,4%%date:~5,2%%date:~8,2%.tar.gz D:\fastposter\data
```

### 6.3 恢复数据

```powershell
# 停止并删除容器
docker stop fastposter
docker rm fastposter

# 解压备份到 data 目录
tar -xzf D:\fastposter\backup\fastposter-data-20260515.tar.gz -C D:\fastposter

# 重新创建容器
docker run -d --name fastposter --restart unless-stopped ^
  -p 5000:5000 ^
  -e TOKEN="ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv" ^
  -v D:/fastposter/data:/app/data ^
  fastposter:local
```

### 6.4 迁移到其他机器

```powershell
# 1. 打包数据
tar -czf fastposter-migrate.tar.gz D:\fastposter\data

# 2. 复制到目标机器（U盘/网络）

# 3. 目标机器构建镜像
cd D:\fastposter
docker build -t fastposter:local .

# 4. 恢复数据并启动
docker run -d --name fastposter --restart unless-stopped ^
  -p 5000:5000 ^
  -e TOKEN="ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv" ^
  -v D:/fastposter/data:/app/data ^
  fastposter:local
```

---

## 7. Docker Compose 部署

### 7.1 创建 docker-compose.yml

在 `D:\fastposter` 目录下创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  fastposter:
    build: .
    image: fastposter:local
    container_name: fastposter
    ports:
      - "5000:5000"
    environment:
      - TOKEN=${FASTPOSTER_TOKEN:-ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv}
      - TZ=Asia/Shanghai
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 7.2 启动服务

```bash
cd D:\fastposter

# 构建并后台启动
docker compose up -d

# 查看状态
docker compose ps

# 实时日志
docker compose logs -f

# 停止服务
docker compose down

# 停止并删除数据卷
docker compose down -v
```

### 7.3 指定 Token 启动

```bash
# 通过环境变量指定
set FASTPOSTER_TOKEN=my-custom-token
docker compose up -d

# 或直接写在命令行
FASTPOSTER_TOKEN=my-custom-token docker compose up -d
```

---

## 8. 常用管理命令

### 容器生命周期

```bash
# 停止
docker stop fastposter

# 启动
docker start fastposter

# 重启
docker restart fastposter

# 删除
docker rm fastposter

# 删除（强制运行中）
docker rm -f fastposter
```

### 日志管理

```bash
# 查看最新 50 行日志
docker logs --tail 50 fastposter

# 实时跟踪日志
docker logs -f fastposter

# 查看指定时间后的日志
docker logs --since 5m fastposter
```

### 镜像管理

```bash
# 列出所有镜像
docker images

# 删除指定镜像
docker rmi fastposter:local

# 清理未使用的镜像
docker image prune

# 完全清理（包括所有未使用的镜像）
docker system prune -a
```

### 容器内操作

```bash
# 进入容器
docker exec -it fastposter bash

# 进入后可以执行命令，例如：
ls -la data/db/
python -c "import sqlite3; print(sqlite3.sqlite_version)"

# 不进入容器直接执行命令
docker exec fastposter ls -la data/db/
```

### 资源监控

```bash
# 实时资源占用
docker stats fastposter --no-stream

# 查看容器详情
docker inspect fastposter

# 查看端口映射
docker port fastposter
```

### 重新部署（更新代码后）

```bash
cd D:\fastposter

# 1. 停止旧容器
docker stop fastposter
docker rm fastposter

# 2. 重新构建镜像（利用缓存，很快）
docker build -t fastposter:local .

# 3. 启动新容器
docker run -d --name fastposter --restart unless-stopped ^
  -p 5000:5000 ^
  -e TOKEN="ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv" ^
  -v D:/fastposter/data:/app/data ^
  fastposter:local

# 4. 验证
docker logs fastposter
```

---

## 9. 微信小程序对接

### 9.1 本地开发调试

小程序连接本地服务需在微信开发者工具中设置：

1. 打开微信开发者工具
2. 选择 `D:\fastposter\wx` 目录
3. **详情 → 本地设置** → 勾选 **"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"**
4. 小程序设置页填写：
   - 服务器地址：`http://192.168.x.x:5000`（填写你电脑的局域网 IP，不要用 127.0.0.1）
   - Token：`ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv`

> **注意**：真机预览时，`127.0.0.1` 指向手机本身，必须填写电脑的局域网 IP 地址。可以通过 `ipconfig` 查看。

### 9.2 生产环境域名配置

发布小程序前需配置 HTTPS 域名：

1. 购买云服务器，部署 Docker 容器（参考第 4 章）
2. 配置 Nginx 反向代理并申请 SSL 证书
3. 登录 [微信公众平台](https://mp.weixin.qq.com/)
4. 开发 → 开发管理 → 服务器域名
5. 添加 `request` 合法域名：`https://你的域名.com`

---

## 10. 故障排查

### 端口被占用

```bash
# 查看 5000 端口被谁占用
netstat -ano | findstr :5000

# 找到 PID 后终止进程
taskkill /F /PID 进程ID
```

### 容器无法启动

```bash
# 查看详细日志
docker logs fastposter

# 常见错误：端口冲突
# 解决：换端口映射，如 -p 5001:5000
```

### Docker Desktop 未运行

```bash
# 启动 Docker Desktop
# 开始菜单 → Docker Desktop

# 或从命令行启动
"C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### 数据卷权限问题

```bash
# Windows 下挂载的目录可能会权限不足
# 解决方案：确保 data 目录存在
mkdir -p D:\fastposter\data\db
mkdir -p D:\fastposter\data\store
```

### 构建镜像失败

```bash
# 常见原因：网络问题导致 pip 安装失败
# 解决方案：使用国内 pip 镜像
docker build -t fastposter:local . --build-arg PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
```

### Token 认证失败

```bash
# 检查容器环境变量
docker inspect fastposter | grep -A2 TOKEN

# 确认 app.yml 中的 Token 与 -e TOKEN 一致
# 或通过 -t 参数启动
```

---

## 附录

### 完整部署脚本（Windows PowerShell）

保存为 `deploy.ps1`：

```powershell
# FastPoster 本地 Docker 部署脚本
$TOKEN = "ApfrIzxCoK1DwNZOEJCwlrnv6QZ0PCdv"
$PORT = 5000
$DATA_DIR = "D:\fastposter\data"

Write-Host "=== FastPoster Docker 部署 ===" -ForegroundColor Green

# 创建数据目录
New-Item -ItemType Directory -Force -Path "$DATA_DIR\db" | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\store" | Out-Null

# 构建镜像
Write-Host "[1/3] 构建 Docker 镜像..." -ForegroundColor Yellow
docker build -t fastposter:local .

# 停止旧容器
docker stop fastposter 2>$null
docker rm fastposter 2>$null

# 启动新容器
Write-Host "[2/3] 启动容器..." -ForegroundColor Yellow
docker run -d `
  --name fastposter `
  --restart unless-stopped `
  -p ${PORT}:5000 `
  -e TOKEN="$TOKEN" `
  -v "${DATA_DIR}:/app/data" `
  fastposter:local

# 等待启动
Start-Sleep -Seconds 3

# 验证
Write-Host "[3/3] 验证部署..." -ForegroundColor Yellow
docker ps -f name=fastposter --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "=== 部署完成 ===" -ForegroundColor Green
Write-Host "管理后台: http://localhost:${PORT}"
Write-Host "API Token: $TOKEN"
```
