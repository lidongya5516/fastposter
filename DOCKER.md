# fastposter Docker 部署

## 方法一：使用官方镜像（推荐）

### 1. 拉取并运行

```bash
docker run -it --name fastposter -p 5000:5000 fastposter/fastposter
```

服务启动后访问 `http://localhost:5000` 即可打开管理后台。

### 2. 使用自定义 Token

```bash
docker run -it --name fastposter -p 5000:5000 \
  -e TOKEN=your-custom-token \
  fastposter/fastposter
```

### 3. 持久化数据

```bash
docker run -it --name fastposter -p 5000:5000 \
  -e TOKEN=your-custom-token \
  -v /host/data/fastposter:/app/data \
  fastposter/fastposter
```

> 将 `/host/data/fastposter` 替换为主机上的实际路径用于持久化海报数据和上传文件。

### 4. 后台运行

```bash
docker run -d --name fastposter -p 5000:5000 \
  -e TOKEN=your-custom-token \
  -v /host/data/fastposter:/app/data \
  --restart unless-stopped \
  fastposter/fastposter
```

### 5. 查看日志

```bash
docker logs -f fastposter
```

---

## 方法二：使用 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  fastposter:
    image: fastposter/fastposter
    container_name: fastposter
    ports:
      - "5000:5000"
    environment:
      - TOKEN=your-custom-token
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

启动服务：

```bash
docker-compose up -d
```

查看日志：

```bash
docker-compose logs -f
```

停止服务：

```bash
docker-compose down
```

---

## 方法三：从源码构建镜像

### 1. 创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

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

# 启动服务
CMD ["python", "fast.py"]
```

### 2. 创建 .dockerignore

在项目根目录创建 `.dockerignore`：

```dockerignore
__pycache__/
*.pyc
*.pyo
.env
.git/
.claude/
data/
test/
test_*.png
*.md
```

### 3. 构建镜像

```bash
docker build -t fastposter:custom .
```

### 4. 运行自定义镜像

```bash
docker run -d --name fastposter -p 5000:5000 \
  -e TOKEN=your-custom-token \
  -v /host/data/fastposter:/app/data \
  fastposter:custom
```

---

## 方法四：使用 docker-compose 从源码构建

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  fastposter:
    build: .
    image: fastposter:custom
    container_name: fastposter
    ports:
      - "5000:5000"
    environment:
      - TOKEN=your-custom-token
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

构建并启动：

```bash
docker-compose up -d
```

---

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `TOKEN` | API 认证令牌 | 从 `app.yml` 读取 |
| `POSTER_URI_PREFIX` | 服务 URI 前缀 | `http://0.0.0.0:5000/` |
| `POSTER_DEBUG` | 开启 Tornado debug 模式 | `false` |

> 注：Docker 环境中 `FASTPOSTER_IN_DOCKER` 被自动设置，无需手动配置。

## 数据持久化

容器中数据存储在 `/app/data` 目录下，包含：

| 路径 | 说明 |
|------|------|
| `/app/data/db/poster.sqlite` | 海报数据库 |
| `/app/data/db/cache.sqlite` | HTTP 请求缓存 |
| `/app/data/store/upload/` | 上传的图片文件 |
| `/app/data/store/preview/` | 预览缩略图 |

建议通过 volume 挂载持久化：

```bash
-v /host/path/data:/app/data
```

## Nginx 反向代理（Docker 场景）

```nginx
server {
    listen 80;
    server_name poster.example.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Docker 常用命令

```bash
# 查看运行中的容器
docker ps

# 停止容器
docker stop fastposter

# 启动容器
docker start fastposter

# 重启容器
docker restart fastposter

# 删除容器
docker rm fastposter

# 查看日志（实时）
docker logs -f fastposter

# 进入容器
docker exec -it fastposter bash
```

## 注意事项

1. **首次启动**会通过 `dao.py` 自动创建 SQLite 数据库表
2. 默认 Token 可在 `app.yml` 中配置，或通过 `TOKEN` 环境变量设置
3. 挂载 volume 时确保主机目录存在且有正确的读写权限
4. 如需修改端口，调整 `-p` 参数，如 `-p 8080:5000` 映射到主机 8080 端口
5. 官方镜像支持 `arm` 和 `x86` 架构
