# ServerMaintenanceAgent

AI驱动的服务器维护代理系统，通过实时监控、智能分析和自动化操作来维护服务器健康状态。

## 功能特性

- 🤖 AI驱动的智能服务器维护
- 📊 实时服务器状态监控
- 🔧 自定义AI任务配置
- 📝 详细操作记录与审计
- 🎯 服务器分组管理
- 🔄 AI学习与操作复用
- 🖥️ 现代化Web管理界面
- ⚡ Go轻量级子代理

## 技术栈

### 前端
- Next.js 14+ (App Router)
- React 18+ with TypeScript
- Tailwind CSS + shadcn/ui
- WebSocket实时通信

### 后端
- Node.js with Express
- TypeScript
- PostgreSQL数据库
- WebSocket服务器

### 子代理
- Go 1.21+
- 跨平台支持
- 低资源占用

### AI集成
- OpenAI GPT-4 API
- 自定义提示词工程
- 操作模式学习

## 项目结构

```
ServerMaintenanceAgent/
├── frontend/          # Next.js前端应用
├── backend/           # Node.js后端服务
├── agent/             # Go子代理
├── database/          # 数据库脚本和迁移
└── docs/              # 项目文档
```

## 快速开始

### 前置要求
- Node.js 18+
- Go 1.21+
- PostgreSQL 14+
- Redis (可选)

### 安装

1. 克隆仓库
```bash
git clone https://github.com/Fearless743/ServerMaintenanceAgent.git
cd ServerMaintenanceAgent
```

2. 安装前端依赖
```bash
cd frontend
npm install
```

3. 安装后端依赖
```bash
cd ../backend
npm install
```

4. 编译Go代理
```bash
cd ../agent
go build -o bin/agent ./cmd/agent
```

5. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件，配置数据库连接等
```

6. 初始化数据库
```bash
cd ../database
npm run migrate
```

7. 启动服务
```bash
# 启动后端
cd ../backend
npm run dev

# 启动前端
cd ../frontend
npm run dev
```

## 开发

### 前端开发
```bash
cd frontend
npm run dev
```

### 后端开发
```bash
cd backend
npm run dev
```

### Go代理开发
```bash
cd agent
go run cmd/agent/main.go
```

## 部署

### Docker部署
```bash
docker-compose up -d
```

### 生产环境
参考 `docs/deployment.md`

## API文档

启动后端服务后，访问 `http://localhost:3001/api-docs` 查看API文档。

## 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件