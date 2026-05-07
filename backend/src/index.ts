import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import dotenv from 'dotenv';

import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { setupWebSocket } from './config/websocket';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// 路由导入
import authRoutes from './routes/auth';
import serverRoutes from './routes/servers';
import serverGroupRoutes from './routes/serverGroups';
import aiTaskRoutes from './routes/aiTasks';
import aiOperationRoutes from './routes/aiOperations';
import dashboardRoutes from './routes/dashboard';
import systemConfigRoutes from './routes/systemConfig';
import alertRoutes from './routes/alerts';
import userRoutes from './routes/users';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
  },
});
app.use('/api/', limiter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/server-groups', serverGroupRoutes);
app.use('/api/ai-tasks', aiTaskRoutes);
app.use('/api/ai-operations', aiOperationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();
    console.log('数据库连接成功');

    // 连接Redis
    await connectRedis();
    console.log('Redis连接成功');

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    });

    // 设置WebSocket
    setupWebSocket(server);
    console.log('WebSocket服务器已启动');

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('收到SIGTERM信号，正在关闭服务器...');
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('收到SIGINT信号，正在关闭服务器...');
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;