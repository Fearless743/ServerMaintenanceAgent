import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// 验证模式
const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  server_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  metric_name: z.string().min(1).max(50),
  condition: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'contains']),
  threshold: z.number(),
  duration: z.number().int().min(1).default(60),
  severity: z.enum(['info', 'warning', 'critical', 'emergency']).default('warning'),
  notification_channels: z.array(z.string()).default([]),
  is_enabled: z.boolean().default(true),
});

const updateAlertRuleSchema = createAlertRuleSchema.partial();

const alertQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  status: z.string().optional(),
  severity: z.string().optional(),
  server_id: z.string().uuid().optional(),
});

// 获取告警规则列表
router.get('/rules', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT ar.*, 
            s.name as server_name,
            sg.name as group_name,
            u.username as created_by_username
     FROM alert_rules ar
     LEFT JOIN servers s ON ar.server_id = s.id
     LEFT JOIN server_groups sg ON ar.group_id = sg.id
     LEFT JOIN users u ON ar.created_by = u.id
     ORDER BY ar.name`
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

// 获取告警规则详情
router.get('/rules/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT ar.*, 
            s.name as server_name,
            sg.name as group_name,
            u.username as created_by_username
     FROM alert_rules ar
     LEFT JOIN servers s ON ar.server_id = s.id
     LEFT JOIN server_groups sg ON ar.group_id = sg.id
     LEFT JOIN users u ON ar.created_by = u.id
     WHERE ar.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('告警规则未找到');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// 创建告警规则
router.post('/rules', authenticate, authorize('admin', 'user'), validateBody(createAlertRuleSchema), async (req: Request, res: Response) => {
  const ruleData = req.body;
  const userId = req.user!.id;

  // 检查服务器是否存在
  if (ruleData.server_id) {
    const serverResult = await query(
      'SELECT id FROM servers WHERE id = $1',
      [ruleData.server_id]
    );

    if (serverResult.rows.length === 0) {
      throw ApiError.badRequest('服务器不存在');
    }
  }

  // 检查分组是否存在
  if (ruleData.group_id) {
    const groupResult = await query(
      'SELECT id FROM server_groups WHERE id = $1',
      [ruleData.group_id]
    );

    if (groupResult.rows.length === 0) {
      throw ApiError.badRequest('服务器分组不存在');
    }
  }

  const result = await query(
    `INSERT INTO alert_rules (name, description, server_id, group_id, metric_name, condition, threshold, duration, severity, notification_channels, is_enabled, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      ruleData.name,
      ruleData.description,
      ruleData.server_id,
      ruleData.group_id,
      ruleData.metric_name,
      ruleData.condition,
      ruleData.threshold,
      ruleData.duration,
      ruleData.severity,
      JSON.stringify(ruleData.notification_channels),
      ruleData.is_enabled,
      userId,
    ]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

// 更新告警规则
router.put('/rules/:id', authenticate, authorize('admin', 'user'), validateBody(updateAlertRuleSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // 检查规则是否存在
  const existingRule = await query(
    'SELECT id FROM alert_rules WHERE id = $1',
    [id]
  );

  if (existingRule.rows.length === 0) {
    throw ApiError.notFound('告警规则未找到');
  }

  // 构建更新语句
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'notification_channels') {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
      }
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    throw ApiError.badRequest('没有提供更新数据');
  }

  updateValues.push(id);

  const result = await query(
    `UPDATE alert_rules 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    updateValues
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// 删除告警规则
router.delete('/rules/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM alert_rules WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('告警规则未找到');
  }

  res.json({
    success: true,
    message: '告警规则已删除',
  });
});

// 获取告警历史
router.get('/history', authenticate, validateQuery(alertQuerySchema), async (req: Request, res: Response) => {
  const { page, limit, status, severity, server_id } = req.query as any;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND ah.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (severity) {
    whereClause += ` AND ar.severity = $${paramIndex}`;
    params.push(severity);
    paramIndex++;
  }

  if (server_id) {
    whereClause += ` AND ah.server_id = $${paramIndex}`;
    params.push(server_id);
    paramIndex++;
  }

  // 获取总数
  const countResult = await query(
    `SELECT COUNT(*) 
     FROM alert_history ah
     JOIN alert_rules ar ON ah.rule_id = ar.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // 获取告警历史
  const result = await query(
    `SELECT ah.*, 
            ar.name as rule_name,
            ar.severity,
            ar.metric_name,
            ar.condition,
            ar.threshold,
            s.name as server_name,
            u.username as acknowledged_by_username
     FROM alert_history ah
     JOIN alert_rules ar ON ah.rule_id = ar.id
     LEFT JOIN servers s ON ah.server_id = s.id
     LEFT JOIN users u ON ah.acknowledged_by = u.id
     ${whereClause}
     ORDER BY ah.triggered_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// 确认告警
router.post('/history/:id/acknowledge', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await query(
    `UPDATE alert_history 
     SET status = 'acknowledged', 
         acknowledged_by = $1,
         acknowledged_at = NOW()
     WHERE id = $2 AND status = 'active'
     RETURNING *`,
    [userId, id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('告警未找到或已处理');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// 解决告警
router.post('/history/:id/resolve', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE alert_history 
     SET status = 'resolved', 
         resolved_at = NOW()
     WHERE id = $1 AND status IN ('active', 'acknowledged')
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('告警未找到或已解决');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// 获取告警统计
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  const result = await query(`
    SELECT 
      COUNT(*) as total_alerts,
      COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
      COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_alerts,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
      COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'emergency') as critical_alerts,
      COUNT(*) FILTER (WHERE triggered_at >= NOW() - INTERVAL '24 hours') as today_alerts,
      COUNT(*) FILTER (WHERE triggered_at >= NOW() - INTERVAL '7 days') as week_alerts
    FROM alert_history
  `);

  res.json({
    success: true,
    data: result.rows[0],
  });
});

export default router;