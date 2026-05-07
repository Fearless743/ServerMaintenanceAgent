import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/server_maintenance',
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('开始插入测试数据...');
    
    // 获取管理员用户ID
    const adminResult = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    const adminId = adminResult.rows[0]?.id;
    
    if (!adminId) {
      throw new Error('管理员用户不存在，请先运行迁移脚本');
    }
    
    // 获取服务器分组ID
    const groupsResult = await client.query('SELECT id, name FROM server_groups');
    const groups = groupsResult.rows;
    const prodGroupId = groups.find(g => g.name === '生产环境')?.id;
    const testGroupId = groups.find(g => g.name === '测试环境')?.id;
    const devGroupId = groups.find(g => g.name === '开发环境')?.id;
    
    // 插入测试服务器
    const servers = [
      {
        name: 'web-server-01',
        hostname: '192.168.1.101',
        port: 22,
        ip_address: '192.168.1.101',
        os_type: 'Linux',
        os_version: 'Ubuntu 22.04 LTS',
        status: 'online',
        group_id: prodGroupId,
        ssh_username: 'root',
        agent_port: 8080,
        agent_status: 'connected',
        tags: ['web', 'nginx', 'production'],
        created_by: adminId,
      },
      {
        name: 'db-server-01',
        hostname: '192.168.1.102',
        port: 22,
        ip_address: '192.168.1.102',
        os_type: 'Linux',
        os_version: 'CentOS 8',
        status: 'online',
        group_id: prodGroupId,
        ssh_username: 'root',
        agent_port: 8080,
        agent_status: 'connected',
        tags: ['database', 'postgresql', 'production'],
        created_by: adminId,
      },
      {
        name: 'api-server-01',
        hostname: '192.168.1.103',
        port: 22,
        ip_address: '192.168.1.103',
        os_type: 'Linux',
        os_version: 'Ubuntu 22.04 LTS',
        status: 'warning',
        group_id: prodGroupId,
        ssh_username: 'root',
        agent_port: 8080,
        agent_status: 'connected',
        tags: ['api', 'nodejs', 'production'],
        created_by: adminId,
      },
      {
        name: 'test-web-01',
        hostname: '192.168.2.101',
        port: 22,
        ip_address: '192.168.2.101',
        os_type: 'Linux',
        os_version: 'Ubuntu 22.04 LTS',
        status: 'online',
        group_id: testGroupId,
        ssh_username: 'test',
        agent_port: 8080,
        agent_status: 'disconnected',
        tags: ['web', 'testing'],
        created_by: adminId,
      },
      {
        name: 'dev-server-01',
        hostname: '192.168.3.101',
        port: 22,
        ip_address: '192.168.3.101',
        os_type: 'Linux',
        os_version: 'Ubuntu 22.04 LTS',
        status: 'online',
        group_id: devGroupId,
        ssh_username: 'dev',
        agent_port: 8080,
        agent_status: 'disconnected',
        tags: ['development', 'docker'],
        created_by: adminId,
      },
    ];
    
    for (const server of servers) {
      await client.query(`
        INSERT INTO servers (name, hostname, port, ip_address, os_type, os_version, status, group_id, ssh_username, agent_port, agent_status, tags, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [
        server.name, server.hostname, server.port, server.ip_address,
        server.os_type, server.os_version, server.status, server.group_id,
        server.ssh_username, server.agent_port, server.agent_status,
        JSON.stringify(server.tags), server.created_by,
      ]);
    }
    
    console.log(`已插入 ${servers.length} 个测试服务器`);
    
    // 插入AI任务
    const tasks = [
      {
        name: '磁盘空间清理',
        description: '自动清理临时文件和日志文件，释放磁盘空间',
        prompt_template: '分析服务器 {{server_name}} 的磁盘使用情况，找出占用空间最大的文件和目录，并建议清理策略。',
        task_type: 'maintenance',
        priority: 8,
        is_enabled: true,
        group_id: prodGroupId,
        parameters: { max_age_days: 30, min_size_mb: 100 },
        created_by: adminId,
      },
      {
        name: '内存使用优化',
        description: '分析内存使用模式，优化内存分配',
        prompt_template: '分析服务器 {{server_name}} 的内存使用情况，识别内存泄漏或过度使用的进程，并提供优化建议。',
        task_type: 'optimization',
        priority: 7,
        is_enabled: true,
        group_id: prodGroupId,
        parameters: { threshold_percent: 85 },
        created_by: adminId,
      },
      {
        name: '安全漏洞扫描',
        description: '扫描系统安全漏洞和配置问题',
        prompt_template: '对服务器 {{server_name}} 进行安全扫描，检查系统漏洞、开放端口、弱密码等安全问题。',
        task_type: 'security',
        priority: 9,
        is_enabled: true,
        group_id: prodGroupId,
        parameters: { scan_type: 'full' },
        created_by: adminId,
      },
      {
        name: '数据库性能分析',
        description: '分析数据库查询性能和索引使用情况',
        prompt_template: '分析服务器 {{server_name}} 上的 PostgreSQL 数据库性能，包括慢查询、索引使用率、连接数等。',
        task_type: 'optimization',
        priority: 6,
        is_enabled: true,
        group_id: prodGroupId,
        parameters: { slow_query_threshold_ms: 1000 },
        created_by: adminId,
      },
      {
        name: '系统健康检查',
        description: '全面检查系统健康状况',
        prompt_template: '对服务器 {{server_name}} 进行全面健康检查，包括CPU、内存、磁盘、网络、进程等所有关键指标。',
        task_type: 'monitoring',
        priority: 5,
        is_enabled: true,
        group_id: prodGroupId,
        parameters: {},
        created_by: adminId,
      },
    ];
    
    for (const task of tasks) {
      await client.query(`
        INSERT INTO ai_tasks (name, description, prompt_template, task_type, priority, is_enabled, group_id, parameters, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [
        task.name, task.description, task.prompt_template, task.task_type,
        task.priority, task.is_enabled, task.group_id,
        JSON.stringify(task.parameters), task.created_by,
      ]);
    }
    
    console.log(`已插入 ${tasks.length} 个AI任务`);
    
    // 插入服务器指标数据
    const serverIds = await client.query('SELECT id FROM servers');
    const now = new Date();
    
    for (const server of serverIds.rows) {
      // 插入最近24小时的指标数据
      for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const cpuUsage = Math.random() * 80 + 10; // 10-90%
        const memoryUsage = Math.random() * 70 + 20; // 20-90%
        const diskUsage = Math.random() * 50 + 30; // 30-80%
        
        await client.query(`
          INSERT INTO server_metrics (server_id, cpu_usage, memory_usage, memory_total, memory_used, disk_usage, disk_total, disk_used, network_in, network_out, load_average_1m, load_average_5m, load_average_15m, process_count, uptime, collected_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          server.id,
          cpuUsage.toFixed(2),
          memoryUsage.toFixed(2),
          16 * 1024 * 1024 * 1024, // 16GB
          (16 * 1024 * 1024 * 1024 * memoryUsage / 100).toFixed(0),
          diskUsage.toFixed(2),
          500 * 1024 * 1024 * 1024, // 500GB
          (500 * 1024 * 1024 * 1024 * diskUsage / 100).toFixed(0),
          Math.floor(Math.random() * 1000000000), // 网络入
          Math.floor(Math.random() * 500000000), // 网络出
          (Math.random() * 4).toFixed(2),
          (Math.random() * 3).toFixed(2),
          (Math.random() * 2).toFixed(2),
          Math.floor(Math.random() * 200) + 50,
          Math.floor(Math.random() * 1000000),
          timestamp.toISOString(),
        ]);
      }
    }
    
    console.log(`已插入 ${serverIds.rows.length * 25} 条服务器指标数据`);
    
    // 插入AI操作记录
    const operations = [
      {
        server_id: serverIds.rows[0]?.id,
        operation_type: 'analysis',
        title: '磁盘空间分析',
        description: '分析web-server-01的磁盘使用模式',
        ai_prompt: '分析服务器web-server-01的磁盘使用情况',
        ai_response: '发现/tmp目录占用15GB空间，建议清理30天前的临时文件',
        ai_confidence: 0.94,
        ai_model: 'gpt-4',
        status: 'success',
        execution_time: 2300,
        risk_level: 'low',
        is_automated: true,
        created_by: adminId,
      },
      {
        server_id: serverIds.rows[1]?.id,
        operation_type: 'optimization',
        title: '数据库索引优化',
        description: '优化PostgreSQL数据库索引',
        ai_prompt: '分析PostgreSQL数据库性能并优化索引',
        ai_response: '发现3个缺失索引，已创建建议的索引',
        ai_confidence: 0.88,
        ai_model: 'gpt-4',
        status: 'success',
        execution_time: 5100,
        risk_level: 'medium',
        is_automated: true,
        created_by: adminId,
      },
      {
        server_id: serverIds.rows[2]?.id,
        operation_type: 'monitoring',
        title: '内存使用监控',
        description: '监控api-server-01的内存使用趋势',
        ai_prompt: '监控api-server-01的内存使用情况',
        ai_response: '内存使用率持续上升，建议检查Node.js应用内存泄漏',
        ai_confidence: 0.72,
        ai_model: 'gpt-4',
        status: 'warning',
        execution_time: 1800,
        risk_level: 'medium',
        is_automated: true,
        created_by: adminId,
      },
    ];
    
    for (const operation of operations) {
      await client.query(`
        INSERT INTO ai_operations (server_id, operation_type, title, description, ai_prompt, ai_response, ai_confidence, ai_model, status, execution_time, risk_level, is_automated, created_by, started_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT DO NOTHING
      `, [
        operation.server_id, operation.operation_type, operation.title,
        operation.description, operation.ai_prompt, operation.ai_response,
        operation.ai_confidence, operation.ai_model, operation.status,
        operation.execution_time, operation.risk_level, operation.is_automated,
        operation.created_by,
        new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString(),
      ]);
    }
    
    console.log(`已插入 ${operations.length} 条AI操作记录`);
    
    // 插入AI学习模式
    const patterns = [
      {
        pattern_name: '磁盘空间清理模式',
        pattern_type: 'maintenance_pattern',
        pattern_data: {
          trigger: 'disk_usage > 80%',
          actions: ['清理临时文件', '压缩日志文件', '删除旧备份'],
          success_rate: 0.95,
        },
        success_rate: 0.95,
        usage_count: 15,
        is_active: true,
      },
      {
        pattern_name: '内存泄漏检测模式',
        pattern_type: 'optimization_pattern',
        pattern_data: {
          trigger: 'memory_usage持续上升',
          actions: ['分析进程内存使用', '识别内存泄漏进程', '重启问题服务'],
          success_rate: 0.88,
        },
        success_rate: 0.88,
        usage_count: 8,
        is_active: true,
      },
    ];
    
    for (const pattern of patterns) {
      await client.query(`
        INSERT INTO ai_learning_patterns (pattern_name, pattern_type, pattern_data, success_rate, usage_count, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        pattern.pattern_name, pattern.pattern_type,
        JSON.stringify(pattern.pattern_data), pattern.success_rate,
        pattern.usage_count, pattern.is_active,
      ]);
    }
    
    console.log(`已插入 ${patterns.length} 个AI学习模式`);
    
    console.log('\n测试数据插入完成！');
    
  } catch (error) {
    console.error('插入测试数据失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  seed()
    .then(() => {
      console.log('种子脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('种子脚本执行失败:', error);
      process.exit(1);
    });
}

export { seed };