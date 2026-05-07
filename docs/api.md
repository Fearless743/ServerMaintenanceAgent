# ServerMaintenanceAgent API文档

## 概述

ServerMaintenanceAgent提供RESTful API接口，用于管理服务器、AI任务、操作记录等。

## 基础信息

- 基础URL: `http://localhost:3001/api`
- 认证方式: Bearer Token (JWT)
- 内容类型: `application/json`

## 认证

### 登录

```http
POST /api/auth/login
```

请求体：
```json
{
  "username": "admin",
  "password": "admin123"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### 注册

```http
POST /api/auth/register
```

请求体：
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "full_name": "New User"
}
```

### 刷新令牌

```http
POST /api/auth/refresh-token
```

请求体：
```json
{
  "refreshToken": "your-refresh-token"
}
```

## 服务器管理

### 获取服务器列表

```http
GET /api/servers
```

查询参数：
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `sort`: 排序字段 (默认: created_at)
- `order`: 排序方向 (asc/desc)
- `search`: 搜索关键词
- `status`: 状态筛选
- `group_id`: 分组ID筛选

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "web-server-01",
      "hostname": "192.168.1.101",
      "status": "online",
      "agent_status": "connected",
      "group_name": "生产环境",
      "cpu_usage": 45.2,
      "memory_usage": 62.8,
      "disk_usage": 78.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 获取服务器详情

```http
GET /api/servers/:id
```

### 创建服务器

```http
POST /api/servers
```

请求体：
```json
{
  "name": "new-server",
  "hostname": "192.168.1.100",
  "port": 22,
  "group_id": "group-uuid",
  "ssh_username": "root",
  "tags": ["web", "production"]
}
```

### 更新服务器

```http
PUT /api/servers/:id
```

### 删除服务器

```http
DELETE /api/servers/:id
```

### 测试服务器连接

```http
POST /api/servers/:id/test-connection
```

### 获取服务器指标

```http
GET /api/servers/:id/metrics
```

查询参数：
- `hours`: 时间范围（小时，默认: 24）

## 服务器分组

### 获取分组列表

```http
GET /api/server-groups
```

### 获取分组详情

```http
GET /api/server-groups/:id
```

### 创建分组

```http
POST /api/server-groups
```

请求体：
```json
{
  "name": "新分组",
  "description": "分组描述",
  "color": "#3B82F6",
  "icon": "server"
}
```

### 更新分组

```http
PUT /api/server-groups/:id
```

### 删除分组

```http
DELETE /api/server-groups/:id
```

## AI任务管理

### 获取任务列表

```http
GET /api/ai-tasks
```

查询参数：
- `page`: 页码
- `limit`: 每页数量
- `search`: 搜索关键词
- `task_type`: 任务类型
- `group_id`: 分组ID
- `is_enabled`: 是否启用

### 获取任务详情

```http
GET /api/ai-tasks/:id
```

### 创建任务

```http
POST /api/ai-tasks
```

请求体：
```json
{
  "name": "磁盘空间清理",
  "description": "自动清理临时文件和日志文件",
  "prompt_template": "分析服务器 {{server_name}} 的磁盘使用情况",
  "task_type": "maintenance",
  "priority": 8,
  "group_id": "group-uuid",
  "parameters": {
    "max_age_days": 30,
    "min_size_mb": 100
  }
}
```

### 更新任务

```http
PUT /api/ai-tasks/:id
```

### 删除任务

```http
DELETE /api/ai-tasks/:id
```

### 执行任务

```http
POST /api/ai-tasks/:id/execute
```

请求体：
```json
{
  "server_id": "server-uuid"
}
```

## AI操作记录

### 获取操作列表

```http
GET /api/ai-operations
```

查询参数：
- `page`: 页码
- `limit`: 每页数量
- `search`: 搜索关键词
- `status`: 状态筛选
- `operation_type`: 操作类型
- `server_id`: 服务器ID
- `task_id`: 任务ID
- `risk_level`: 风险级别
- `start_date`: 开始日期
- `end_date`: 结束日期

### 获取操作详情

```http
GET /api/ai-operations/:id
```

### 获取操作统计

```http
GET /api/ai-operations/stats/overview
```

### 获取最近操作

```http
GET /api/ai-operations/recent
```

查询参数：
- `limit`: 数量限制 (默认: 10)

### 取消操作

```http
POST /api/ai-operations/:id/cancel
```

### 审批操作

```http
POST /api/ai-operations/:id/approve
```

### 重试操作

```http
POST /api/ai-operations/:id/retry
```

## 仪表板

### 获取统计数据

```http
GET /api/dashboard/stats
```

响应：
```json
{
  "success": true,
  "data": {
    "servers": {
      "total_servers": 10,
      "online_servers": 8,
      "offline_servers": 1,
      "warning_servers": 1
    },
    "tasks": {
      "total_tasks": 15,
      "enabled_tasks": 12
    },
    "operations": {
      "total_operations": 156,
      "success_operations": 142,
      "failed_operations": 8,
      "today_operations": 23
    },
    "recentOperations": [...],
    "alerts": {
      "total_alerts": 5,
      "active_alerts": 2
    }
  }
}
```

### 获取服务器状态概览

```http
GET /api/dashboard/server-status
```

### 获取操作趋势

```http
GET /api/dashboard/operation-trends
```

查询参数：
- `days`: 天数 (默认: 7)

### 获取AI性能指标

```http
GET /api/dashboard/ai-performance
```

### 获取资源使用情况

```http
GET /api/dashboard/resource-usage
```

## 告警管理

### 获取告警规则列表

```http
GET /api/alerts/rules
```

### 创建告警规则

```http
POST /api/alerts/rules
```

请求体：
```json
{
  "name": "CPU使用率过高",
  "description": "CPU使用率超过90%",
  "server_id": "server-uuid",
  "metric_name": "cpu_usage",
  "condition": "gt",
  "threshold": 90,
  "severity": "warning",
  "notification_channels": ["email", "slack"]
}
```

### 获取告警历史

```http
GET /api/alerts/history
```

### 确认告警

```http
POST /api/alerts/history/:id/acknowledge
```

### 解决告警

```http
POST /api/alerts/history/:id/resolve
```

### 获取告警统计

```http
GET /api/alerts/stats
```

## 系统配置

### 获取所有配置

```http
GET /api/system-config
```

### 获取单个配置

```http
GET /api/system-config/:key
```

### 更新配置

```http
PUT /api/system-config/:key
```

请求体：
```json
{
  "config_value": "new-value",
  "description": "配置描述"
}
```

### 获取AI配置

```http
GET /api/system-config/ai/settings
```

### 更新AI配置

```http
PUT /api/system-config/ai/settings
```

请求体：
```json
{
  "ai_model": "gpt-4",
  "ai_max_tokens": 4096,
  "ai_temperature": 0.7
}
```

## 用户管理

### 获取用户列表

```http
GET /api/users
```

### 获取用户详情

```http
GET /api/users/:id
```

### 创建用户

```http
POST /api/users
```

请求体：
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

### 更新用户

```http
PUT /api/users/:id
```

### 删除用户

```http
DELETE /api/users/:id
```

### 重置密码

```http
POST /api/users/:id/reset-password
```

请求体：
```json
{
  "new_password": "new-password"
}
```

### 获取用户活动日志

```http
GET /api/users/:id/activity
```

## 错误处理

所有错误响应格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

常见错误代码：
- `BAD_REQUEST`: 请求参数错误
- `UNAUTHORIZED`: 未认证
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源未找到
- `CONFLICT`: 资源冲突
- `VALIDATION_ERROR`: 数据验证失败
- `INTERNAL_ERROR`: 服务器内部错误

## 速率限制

- 窗口时间: 15分钟
- 最大请求数: 100个IP

超过限制将返回429状态码。

## WebSocket事件

连接地址: `ws://localhost:3001/ws`

认证：
```json
{
  "auth": {
    "token": "your-jwt-token"
  }
}
```

### 服务器状态更新

事件: `server:status`
```json
{
  "server_id": "uuid",
  "status": "online",
  "metrics": {...}
}
```

### 任务进度更新

事件: `task:progress`
```json
{
  "task_id": "uuid",
  "server_id": "uuid",
  "operation_id": "uuid",
  "status": "running",
  "progress": 50
}
```

### 新操作记录

事件: `operation:new`
```json
{
  "operation_id": "uuid",
  "server_id": "uuid",
  "type": "analysis",
  "confidence": 0.95,
  "risk_level": "low"
}
```

### 实时日志流

事件: `log:stream`
```json
{
  "operation_id": "uuid",
  "level": "info",
  "message": "正在执行命令...",
  "timestamp": "2024-01-15T14:30:00Z"
}
```