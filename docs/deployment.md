# ServerMaintenanceAgent 部署指南

## 概述

本文档介绍如何部署ServerMaintenanceAgent系统，包括前端、后端、数据库和Go子代理。

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- Git

## 快速部署

### 1. 克隆仓库

```bash
git clone https://github.com/Fearless743/ServerMaintenanceAgent.git
cd ServerMaintenanceAgent
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 文件，配置以下变量：

```bash
# 必须配置
OPENAI_API_KEY=your-openai-api-key
JWT_SECRET=your-super-secret-jwt-key

# 可选配置
OPENAI_MODEL=gpt-4
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/server_maintenance
REDIS_URL=redis://redis:6379
```

### 3. 启动服务

```bash
docker-compose up -d
```

这将启动以下服务：
- PostgreSQL数据库 (端口 5432)
- Redis缓存 (端口 6379)
- 后端API服务 (端口 3001)
- 前端应用 (端口 3000)

### 4. 访问系统

打开浏览器访问：http://localhost:3000

默认管理员账户：
- 用户名: admin
- 密码: admin123

## 生产环境部署

### 1. 配置生产环境变量

创建生产环境配置文件：

```bash
cp backend/.env.example backend/.env.production
```

编辑 `backend/.env.production`：

```bash
NODE_ENV=production
JWT_SECRET=your-very-long-and-secure-jwt-secret-key
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=postgresql://user:password@your-db-host:5432/server_maintenance
REDIS_URL=redis://your-redis-host:6379
CORS_ORIGIN=https://your-domain.com
```

### 2. 使用生产环境配置启动

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. 配置反向代理

推荐使用Nginx作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

## Go子代理部署

### 1. 编译代理

```bash
cd agent
go build -o bin/agent ./cmd/agent
```

### 2. 部署到目标服务器

将编译好的二进制文件复制到目标服务器：

```bash
scp bin/agent user@target-server:/opt/agent/
```

### 3. 配置代理

在目标服务器上创建配置文件：

```bash
cd /opt/agent
./agent config init
```

编辑 `agent.yaml`：

```yaml
server_url: "wss://your-domain.com/ws/agent"
agent_id: "your-server-agent-id"
auth_token: "your-auth-token"
metric_interval: 60
heartbeat_interval: 30
```

### 4. 启动代理

```bash
./agent
```

或者使用systemd服务：

```ini
[Unit]
Description=ServerMaintenanceAgent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/agent
ExecStart=/opt/agent/agent
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 数据库迁移

### 初始化数据库

```bash
cd database
npm run migrate
```

### 插入测试数据

```bash
npm run seed
```

### 重置数据库

```bash
npm run reset
```

## 监控和日志

### 查看服务状态

```bash
docker-compose ps
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 健康检查

后端服务提供健康检查端点：

```bash
curl http://localhost:3001/health
```

## 备份和恢复

### 备份数据库

```bash
docker exec server-maintenance-db pg_dump -U postgres server_maintenance > backup.sql
```

### 恢复数据库

```bash
docker exec -i server-maintenance-db psql -U postgres server_maintenance < backup.sql
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查PostgreSQL服务是否启动
   - 验证数据库连接字符串
   - 确保数据库用户有足够权限

2. **Redis连接失败**
   - 检查Redis服务是否启动
   - 验证Redis连接字符串

3. **OpenAI API调用失败**
   - 检查API密钥是否正确
   - 验证API配额是否充足
   - 检查网络连接

4. **WebSocket连接失败**
   - 检查反向代理配置
   - 验证WebSocket URL是否正确
   - 检查防火墙设置

### 查看容器日志

```bash
docker logs server-maintenance-backend
docker logs server-maintenance-frontend
```

### 重启服务

```bash
docker-compose restart
```

### 重建服务

```bash
docker-compose up -d --build
```

## 性能优化

### 数据库优化

1. 调整PostgreSQL配置：
   - `shared_buffers`: 25% of RAM
   - `effective_cache_size`: 75% of RAM
   - `work_mem`: 4MB
   - `maintenance_work_mem`: 64MB

2. 定期清理旧数据：
   ```sql
   DELETE FROM server_metrics WHERE collected_at < NOW() - INTERVAL '30 days';
   DELETE FROM operation_logs WHERE timestamp < NOW() - INTERVAL '90 days';
   ```

### Redis优化

1. 配置内存限制：
   ```
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```

2. 启用持久化：
   ```
   save 900 1
   save 300 10
   save 60 10000
   ```

## 安全建议

1. **更改默认密码**
   - 立即更改管理员密码
   - 使用强密码策略

2. **配置HTTPS**
   - 使用SSL证书
   - 配置HSTS

3. **限制访问**
   - 配置防火墙
   - 使用VPN或IP白名单

4. **定期更新**
   - 更新Docker镜像
   - 更新依赖包
   - 应用安全补丁

5. **备份策略**
   - 定期备份数据库
   - 测试备份恢复流程
   - 异地存储备份