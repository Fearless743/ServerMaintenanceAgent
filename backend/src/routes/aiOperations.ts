import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { emitToOperations } from '../config/websocket';

const router = Router();

// 验证模式
const operationQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.string().optional(),
  operation_type: z.string().optional(),
  server_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  risk_level: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// 获取操作列表
router.get('/', authenticate, validateQuery(operationQuerySchema), async (req: Request, res: Response) => {
  const { 
    page, limit, sort, order, search, status, operation_type, 
    server_id, task_id, risk_level, start_date, end_date 
  } = req.query as any;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (ao.title ILIKE $${paramIndex} OR ao.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND ao.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (operation_type) {
    whereClause += ` AND ao.operation_type = $${paramIndex}`;
    params.push(operation_type);
    paramIndex++;
  }

  if (server_id) {
    whereClause += ` AND ao.server_id = $${paramIndex}`;
    params.push(server_id);
    paramIndex++;
  }

  if (task_id) {
    whereClause += ` AND ao.task_id = $${paramIndex}`;
    params.push(task_id);
    paramIndex++;
  }

  if (risk_level) {
    whereClause += ` AND ao.risk_level = $${paramIndex}`;
    params.push(risk_level);
    paramIndex++;
  }

  if (start_date) {
    whereClause += ` AND ao.created_at >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    whereClause += ` AND ao.created_at <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  // 获取总数
  const countResult = await query(
    `SELECT COUNT(*) FROM ai_operations ao ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // 获取操作列表
  const result = await query(
    `SELECT ao.*, 
            s.name as server_name, s.hostname,
            t.name as task_name,
            u.username as created_by_username
     FROM ai_operations ao
     LEFT JOIN servers s ON ao.server_id = s.id
     LEFT JOIN ai_tasks t ON ao.task_id = t.id
     LEFT JOIN users u ON ao.created_by = u.id
     ${whereClause}
     ORDER BY ao.${sort} ${order}
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

// 获取操作详情
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT ao.*, 
            s.name as server_name, s.hostname,
            t.name as task_name, t.prompt_template,
            u.username as created_by_username,
            approver.username as approved_by_username
     FROM ai_operations ao
     LEFT JOIN servers s ON ao.server_id = s.id
     LEFT JOIN ai_tasks t ON ao.task_id = t.id
     LEFT JOIN users u ON ao.created_by = u.id
     LEFT JOIN users approver ON ao.approved_by = approver.id
     WHERE ao.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('操作记录未找到');
  }

  // 获取操作日志
  const logsResult = await query(
    `SELECT * FROM operation_logs 
     WHERE operation_id = $1 
     ORDER BY timestamp ASC`,
    [id]
  );

  // 获取执行的命令
  const commandsResult = await query(
    `SELECT * FROM operation_commands 
     WHERE operation_id = $1 
     ORDER BY executed_at ASC`,
    [id]
  );

  const operation = result.rows[0];
  operation.logs = logsResult.rows;
  operation.commands = commandsResult.rows;

  res.json({
    success: true,
    data: operation,
  });
});

// 获取操作统计
router.get('/stats/overview', authenticate, async (req: Request, res: Response) => {
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_operations,
      COUNT(*) FILTER (WHERE status = 'success') as success_operations,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_operations,
      COUNT(*) FILTER (WHERE status = 'running') as running_operations,
      COUNT(*) FILTER (WHERE status = 'warning') as warning_operations,
      COUNT(*) FILTER (WHERE operation_type = 'analysis') as analysis_operations,
      COUNT(*) FILTER (WHERE operation_type = 'optimization') as optimization_operations,
      COUNT(*) FILTER (WHERE operation_type = 'repair') as repair_operations,
      COUNT(*) FILTER (WHERE operation_type = 'monitoring') as monitoring_operations,
      COUNT(*) FILTER (WHERE risk_level = 'high' OR risk_level = 'critical') as high_risk_operations,
      AVG(execution_time) as avg_execution_time,
      AVG(ai_confidence) as avg_confidence
    FROM ai_operations
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  res.json({
    success: true,
    data: statsResult.rows[0],
  });
});

// 获取最近操作
router.get('/recent', authenticate, async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  const result = await query(
    `SELECT ao.*, 
            s.name as server_name,
            t.name as task_name
     FROM ai_operations ao
     LEFT JOIN servers s ON ao.server_id = s.id
     LEFT JOIN ai_tasks t ON ao.task_id = t.id
     ORDER BY ao.created_at DESC
     LIMIT $1`,
    [Number(limit)]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

// 取消操作
router.post('/:id/cancel', authenticate, authorize('admin', 'user'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // 检查操作是否存在
  const operationResult = await query(
    'SELECT * FROM ai_operations WHERE id = $1',
    [id]
  );

  if (operationResult.rows.length === 0) {
    throw ApiError.notFound('操作记录未找到');
  }

  const operation = operationResult.rows[0];

  if (operation.status !== 'pending' && operation.status !== 'running') {
    throw ApiError.badRequest('操作无法取消');
  }

  // 更新操作状态
  await query(
    `UPDATE ai_operations 
     SET status = 'cancelled', 
         completed_at = NOW(),
         error_message = '用户取消操作'
     WHERE id = $1`,
    [id]
  );

  // 记录日志
  await query(
    `INSERT INTO operation_logs (operation_id, log_level, message, details)
     VALUES ($1, 'info', '操作已取消', $2)`,
    [id, JSON.stringify({ cancelled_by: userId })]
  );

  // 通知WebSocket客户端
  emitToOperations('operation:cancelled', { operation_id: id });

  res.json({
    success: true,
    message: '操作已取消',
  });
});

// 审批操作
router.post('/:id/approve', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // 检查操作是否存在
  const operationResult = await query(
    'SELECT * FROM ai_operations WHERE id = $1',
    [id]
  );

  if (operationResult.rows.length === 0) {
    throw ApiError.notFound('操作记录未找到');
  }

  const operation = operationResult.rows[0];

  if (!operation.requires_approval) {
    throw ApiError.badRequest('操作不需要审批');
  }

  if (operation.approved_by) {
    throw ApiError.badRequest('操作已审批');
  }

  // 更新操作状态
  await query(
    `UPDATE ai_operations 
     SET approved_by = $1, 
         approved_at = NOW()
     WHERE id = $2`,
    [userId, id]
  );

  // 记录日志
  await query(
    `INSERT INTO operation_logs (operation_id, log_level, message, details)
     VALUES ($1, 'info', '操作已审批', $2)`,
    [id, JSON.stringify({ approved_by: userId })]
  );

  // 通知WebSocket客户端
  emitToOperations('operation:approved', { operation_id: id });

  res.json({
    success: true,
    message: '操作已审批',
  });
});

// 重试操作
router.post('/:id/retry', authenticate, authorize('admin', 'user'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // 检查操作是否存在
  const operationResult = await query(
    'SELECT * FROM ai_operations WHERE id = $1',
    [id]
  );

  if (operationResult.rows.length === 0) {
    throw ApiError.notFound('操作记录未找到');
  }

  const operation = operationResult.rows[0];

  if (operation.status !== 'failed') {
    throw ApiError.badRequest('只能重试失败的操作');
  }

  // 创建新的操作记录
  const newOperationResult = await query(
    `INSERT INTO ai_operations (task_id, server_id, operation_type, title, description, ai_prompt, status, started_at, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, 'running', NOW(), $7, $8)
     RETURNING *`,
    [
      operation.task_id,
      operation.server_id,
      operation.operation_type,
      `重试: ${operation.title}`,
      operation.description,
      operation.ai_prompt,
      userId,
      JSON.stringify({ retry_of: id }),
    ]
  );

  const newOperation = newOperationResult.rows[0];

  // 通知WebSocket客户端
  emitToOperations('operation:retried', { 
    original_operation_id: id,
    new_operation_id: newOperation.id 
  });

  res.json({
    success: true,
    data: newOperation,
  });
});

export default router;