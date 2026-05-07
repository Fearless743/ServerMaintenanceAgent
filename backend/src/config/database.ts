import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/server_maintenance',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时
  connectionTimeoutMillis: 2000, // 连接超时
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('数据库连接成功');
    client.release();
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}

export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('执行查询:', { text, duration, rows: result.rowCount });
  }
  
  return result;
}

export async function getClient(): Promise<any> {
  const client = await pool.connect();
  return client;
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export default pool;