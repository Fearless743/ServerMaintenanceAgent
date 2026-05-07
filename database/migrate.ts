import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/server_maintenance',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('开始数据库迁移...');
    
    // 读取初始化SQL文件
    const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    
    // 执行SQL
    await client.query(initSQL);
    
    console.log('数据库迁移完成！');
    console.log('已创建以下表:');
    console.log('- users (用户表)');
    console.log('- user_sessions (用户会话表)');
    console.log('- server_groups (服务器分组表)');
    console.log('- servers (服务器表)');
    console.log('- ai_tasks (AI任务配置表)');
    console.log('- task_schedules (任务调度表)');
    console.log('- ai_operations (AI操作记录表)');
    console.log('- operation_logs (操作详细日志表)');
    console.log('- operation_commands (操作命令表)');
    console.log('- server_metrics (服务器指标表)');
    console.log('- ai_learning_patterns (AI学习模式表)');
    console.log('- alert_rules (告警规则表)');
    console.log('- alert_history (告警历史表)');
    console.log('- notification_channels (通知配置表)');
    console.log('- system_config (系统配置表)');
    console.log('- audit_logs (审计日志表)');
    
    console.log('\n默认数据:');
    console.log('- 管理员用户: admin / admin123');
    console.log('- 服务器分组: 生产环境, 测试环境, 开发环境');
    console.log('- 系统配置: AI模型、指标收集间隔等');
    console.log('- 告警规则: CPU、内存、磁盘、服务器离线');
    
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

export { migrate };