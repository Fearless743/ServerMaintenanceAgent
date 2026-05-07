import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/auth';

let io: SocketServer;

export function setupWebSocket(httpServer: HttpServer): void {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('未提供认证令牌'));
      }

      const decoded = await verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`客户端连接: ${socket.id}, 用户: ${socket.data.user?.username}`);

    // 加入用户房间
    if (socket.data.user?.id) {
      socket.join(`user:${socket.data.user.id}`);
    }

    // 处理服务器状态订阅
    socket.on('subscribe:server', (serverId: string) => {
      socket.join(`server:${serverId}`);
      console.log(`客户端 ${socket.id} 订阅服务器 ${serverId}`);
    });

    // 处理取消订阅
    socket.on('unsubscribe:server', (serverId: string) => {
      socket.leave(`server:${serverId}`);
      console.log(`客户端 ${socket.id} 取消订阅服务器 ${serverId}`);
    });

    // 处理任务进度订阅
    socket.on('subscribe:task', (taskId: string) => {
      socket.join(`task:${taskId}`);
      console.log(`客户端 ${socket.id} 订阅任务 ${taskId}`);
    });

    // 处理操作日志订阅
    socket.on('subscribe:operations', () => {
      socket.join('operations');
      console.log(`客户端 ${socket.id} 订阅操作日志`);
    });

    // 处理断开连接
    socket.on('disconnect', (reason) => {
      console.log(`客户端断开: ${socket.id}, 原因: ${reason}`);
    });

    // 处理错误
    socket.on('error', (error) => {
      console.error(`Socket错误 ${socket.id}:`, error);
    });
  });

  console.log('WebSocket服务器初始化完成');
}

// 发送消息到特定用户
export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// 发送消息到特定服务器订阅者
export function emitToServer(serverId: string, event: string, data: any): void {
  if (io) {
    io.to(`server:${serverId}`).emit(event, data);
  }
}

// 发送消息到特定任务订阅者
export function emitToTask(taskId: string, event: string, data: any): void {
  if (io) {
    io.to(`task:${taskId}`).emit(event, data);
  }
}

// 发送消息到所有操作日志订阅者
export function emitToOperations(event: string, data: any): void {
  if (io) {
    io.to('operations').emit(event, data);
  }
}

// 广播消息到所有连接的客户端
export function broadcast(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}

// 获取连接的客户端数量
export function getConnectedClients(): number {
  if (io) {
    return io.engine.clientsCount;
  }
  return 0;
}

// 获取Socket.IO实例
export function getSocketIO(): SocketServer | null {
  return io || null;
}