import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// 获取仪表板统计
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  // 并行执行多个查询
  const [
    serverStats,
    taskStats,
    operationStats,
    recentOperations,
    alertStats,
  ] = await Promise.all([
    // 服务器统计
    query(`
      SELECT 
        COUNT(*) as total_servers,
        COUNT(*) FILTER (WHERE status = 'online') as online_servers,
        COUNT(*) FILTER (WHERE status = 'offline') as offline_servers,
        COUNT(*) FILTER (WHERE status = 'warning') as warning_servers,
        COUNT(*) FILTER (WHERE agent_status = 'connected') as connected_agents
      FROM servers
    `),
    
    // 任务统计
    query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE is_enabled = true) as enabled_tasks,
        COUNT(*) FILTER (WHERE task_type = 'maintenance') as maintenance_tasks,
        COUNT(*) FILTER (WHERE task_type = 'monitoring') as monitoring_tasks,
        COUNT(*) FILTER (WHERE task_type = 'optimization') as optimization_tasks,
        COUNT(*) FILTER (WHERE task_type = 'security') as security_tasks
      FROM ai_tasks
    `),
    
    // 操作统计
    query(`
      SELECT 
        COUNT(*) as total_operations,
        COUNT(*) FILTER (WHERE status = 'success') as success_operations,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_operations,
        COUNT(*) FILTER (WHERE status = 'running') as running_operations,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today_operations,
        AVG(execution_time) as avg_execution_time,
        AVG(ai_confidence) as avg_confidence
      FROM ai_operations
    `),
    
    // 最近操作
    query(`
      SELECT ao.*, 
             s.name as server_name,
             t.name as task_name
      FROM ai_operations ao
      LEFT JOIN servers s ON ao.server_id = s.id
      LEFT JOIN ai_tasks t ON ao.task_id = t.id
      ORDER BY ao.created_at DESC
      LIMIT 5
    `),
    
    // 告警统计
    query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_alerts,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'emergency') as critical_alerts
      FROM alert_history
      WHERE triggered_at >= NOW() - INTERVAL '7 days'
    `),
  ]);

  res.json({
    success: true,
    data: {
      servers: serverStats.rows[0],
      tasks: taskStats.rows[0],
      operations: operationStats.rows[0],
      recentOperations: recentOperations.rows,
      alerts: alertStats.rows[0],
    },
  });
});

// 获取服务器状态概览
router.get('/server-status', authenticate, async (req: Request, res: Response) => {
  const result = await query(`
    SELECT 
      s.id,
      s.name,
      s.hostname,
      s.status,
      s.agent_status,
      s.last_heartbeat,
      sg.name as group_name,
      sg.color as group_color,
      sm.cpu_usage,
      sm.memory_usage,
      sm.disk_usage
    FROM servers s
    LEFT JOIN server_groups sg ON s.group_id = sg.id
    LEFT JOIN LATERAL (
      SELECT cpu_usage, memory_usage, disk_usage
      FROM server_metrics
      WHERE server_id = s.id
      ORDER BY collected_at DESC
      LIMIT 1
    ) sm ON true
    ORDER BY s.status, s.name
  `);

  res.json({
    success: true,
    data: result.rows,
  });
});

// 获取操作趋势
router.get('/operation-trends', authenticate, async (req: Request, res: Response) => {
  const { days = 7 } = req.query;

  const result = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'success') as success,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'warning') as warning
    FROM ai_operations
    WHERE created_at >= NOW() - INTERVAL '${Number(days)} days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  res.json({
    success: true,
    data: result.rows,
  });
});

// 获取AI性能指标
router.get('/ai-performance', authenticate, async (req: Request, res: Response) => {
  const result = await query(`
    SELECT 
      ai_model,
      COUNT(*) as total_operations,
      AVG(ai_confidence) as avg_confidence,
      AVG(execution_time) as avg_execution_time,
      COUNT(*) FILTER (WHERE status = 'success') as success_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count
    FROM ai_operations
    WHERE ai_model IS NOT NULL
    GROUP BY ai_model
    ORDER BY total_operations DESC
  `);

  res.json({
    success: true,
    data: result.rows,
  });
});

// 获取服务器资源使用情况
router.get('/resource-usage', authenticate, async (req: Request, res: Response) => {
  const result = await query(`
    SELECT 
      s.id,
      s.name,
      s.status,
      sm.cpu_usage,
      sm.memory_usage,
      sm.disk_usage,
      sm.load_average_1m,
      sm.process_count
    FROM servers s
    LEFT JOIN LATERAL (
      SELECT cpu_usage, memory_usage, disk_usage, load_average_1m, process_count
      FROM server_metrics
      WHERE server_id = s.id
      ORDER BY collected_at DESC
      LIMIT 1
    ) sm ON true
    WHERE s.status = 'online'
    ORDER BY sm.cpu_usage DESC NULLS LAST
    LIMIT 10
  `);

  res.json({
    success: true,
    data: result.rows,
  });
});

export default router;