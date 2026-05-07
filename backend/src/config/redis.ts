import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType;

export async function connectRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Redis重连次数过多');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis连接错误:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis连接成功');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis重新连接中...');
    });

    await redisClient.connect();
  } catch (error) {
    console.error('Redis连接失败:', error);
    // Redis连接失败不阻止应用启动
    console.warn('Redis不可用，将使用内存缓存');
  }
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  return redisClient || null;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
}

// 缓存工具函数
export async function cacheGet(key: string): Promise<string | null> {
  try {
    if (!redisClient) return null;
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis GET错误:', error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttl?: number): Promise<void> {
  try {
    if (!redisClient) return;
    await redisClient.set(key, value);
    if (ttl) {
      await redisClient.expire(key, ttl);
    }
  } catch (error) {
    console.error('Redis SET错误:', error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    if (!redisClient) return;
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis DEL错误:', error);
  }
}

export async function cacheExists(key: string): Promise<boolean> {
  try {
    if (!redisClient) return false;
    return (await redisClient.exists(key)) === 1;
  } catch (error) {
    console.error('Redis EXISTS错误:', error);
    return false;
  }
}