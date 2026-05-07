import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/server_maintenance',
});

async function reset() {
  const client = await pool.connect();
  
  try {
    console.log('开始重置数据库...');
    
    // 删除所有表（按依赖顺序）
    const tables = [
      'audit_logs',
      'system_config',
      'notification_channels',
      'alert_history',
      'alert_rules',
      'ai_learning_patterns',
      'server_metrics',
      'operation_commands',
      'operation_logs',
      'ai_operations',
      'task_schedules',
      'ai_tasks',
      'servers',
      'server_groups',
      'user_sessions',
      'users',
    ];
    
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`已删除表: ${table}`);
    }
    
    // 删除函数
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    console.log('已删除函数: update_updated_at_column');
    
    // 删除扩展
    await client.query('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE');
    console.log('已删除扩展: uuid-ossp');
    
    console.log('\n数据库重置完成！');
    console.log('请运行迁移脚本重新创建表结构：');
    console.log('npm run migrate');
    
  } catch (error) {
    console.error('重置数据库失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  reset()
    .then(() => {
      console.log('重置脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('重置脚本执行失败:', error);
      process.exit(1);
    });
}

export { reset };