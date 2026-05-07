import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { emitToTask } from '../config/websocket';

const router = Router();

// 验证模式
const createTaskSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  prompt_template: z.string().min(1),
  task_type: z.enum(['maintenance', 'monitoring', 'optimization', 'security', 'backup', 'custom']).default('maintenance'),
  priority: z.number().int().min(1).max(10).default(5),
  is_enabled: z.boolean().default(true),
  group_id: z.string().uuid().optional(),
  parameters: z.record(z.any()).default({}),
  schedule_cron: z.string().optional(),
  schedule_interval: z.number().int().min(1).optional(),
  max_execution_time: z.number().int().min(1).max(3600).default(300),
  retry_count: z.number().int().min(0).max(10).default(3),
});

const updateTaskSchema = createTaskSchema.partial();

const taskQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  task_type: z.string().optional(),
  group_id: z.string().uuid().optional(),
  is_enabled: z.string().transform((val) => val === 'true').optional(),
});

// 获取任务列表
router.get('/', authenticate, validateQuery(taskQuerySchema), async (req: Request, res: Response) => {
  const { page, limit, sort, order, search, task_type, group_id, is_enabled } = req.query as any;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (task_type) {
    whereClause += ` AND t.task_type = $${paramIndex}`;
    params.push(task_type);
    paramIndex++;
  }

  if (group_id) {
    whereClause += ` AND t.group_id = $${paramIndex}`;
    params.push(group_id);
    paramIndex++;
  }

  if (is_enabled !== undefined) {
    whereClause += ` AND t.is_enabled = $${paramIndex}`;
    params.push(is_enabled);
    paramIndex++;
  }

  // 获取总数
  const countResult = await query(
    `SELECT COUNT(*) FROM ai_tasks t ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // 获取任务列表
  const result = await query(
    `SELECT t.*, sg.name as group_name, sg.color as group_color,
            u.username as created_by_username,
            COUNT(ts.id) as schedule_count
     FROM ai_tasks t
     LEFT JOIN server_groups sg ON t.group_id = sg.id
     LEFT JOIN users u ON t.created_by = u.id
     LEFT JOIN task_schedules ts ON t.id = ts.task_id
     ${whereClause}
     GROUP BY t.id, sg.name, sg.color, u.username
     ORDER BY t.${sort} ${order}
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

// 获取任务详情
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT t.*, sg.name as group_name, sg.color as group_color,
            u.username as created_by_username
     FROM ai_tasks t
     LEFT JOIN server_groups sg ON t.group_id = sg.id
     LEFT JOIN users u ON t.created_by = u.id
     WHERE t.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('AI任务未找到');
  }

  // 获取任务调度信息
  const schedulesResult = await query(
    `SELECT ts.*, s.name as server_name, s.hostname
     FROM task_schedules ts
     JOIN servers s ON ts.server_id = s.id
     WHERE ts.task_id = $1
     ORDER BY s.name`,
    [id]
  );

  // 获取最近的操作记录
  const operationsResult = await query(
    `SELECT ao.*, s.name as server_name
     FROM ai_operations ao
     JOIN servers s ON ao.server_id = s.id
     WHERE ao.task_id = $1
     ORDER BY ao.created_at DESC
     LIMIT 10`,
    [id]
  );

  const task = result.rows[0];
  task.schedules = schedulesResult.rows;
  task.recent_operations = operationsResult.rows;

  res.json({
    success: true,
    data: task,
  });
});

// 创建任务
router.post('/', authenticate, authorize('admin', 'user'), validateBody(createTaskSchema), async (req: Request, res: Response) => {
  const taskData = req.body;
  const userId = req.user!.id;

  // 检查名称是否已存在
  const existingTask = await query(
    'SELECT id FROM ai_tasks WHERE name = $1',
    [taskData.name]
  );

  if (existingTask.rows.length > 0) {
    throw ApiError.conflict('任务名称已存在');
  }

  // 检查分组是否存在
  if (taskData.group_id) {
    const groupResult = await query(
      'SELECT id FROM server_groups WHERE id = $1',
      [taskData.group_id]
    );

    if (groupResult.rows.length === 0) {
      throw ApiError.badRequest('服务器分组不存在');
    }
  }

  const result = await query(
    `INSERT INTO ai_tasks (name, description, prompt_template, task_type, priority, is_enabled, group_id, parameters, schedule_cron, schedule_interval, max_execution_time, retry_count, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      taskData.name,
      taskData.description,
      taskData.prompt_template,
      taskData.task_type,
      taskData.priority,
      taskData.is_enabled,
      taskData.group_id,
      JSON.stringify(taskData.parameters),
      taskData.schedule_cron,
      taskData.schedule_interval,
      taskData.max_execution_time,
      taskData.retry_count,
      userId,
    ]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

// 更新任务
router.put('/:id', authenticate, authorize('admin', 'user'), validateBody(updateTaskSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // 检查任务是否存在
  const existingTask = await query(
    'SELECT id FROM ai_tasks WHERE id = $1',
    [id]
  );

  if (existingTask.rows.length === 0) {
    throw ApiError.notFound('AI任务未找到');
  }

  // 检查名称是否冲突
  if (updateData.name) {
    const nameConflict = await query(
      'SELECT id FROM ai_tasks WHERE name = $1 AND id != $2',
      [updateData.name, id]
    );

    if (nameConflict.rows.length > 0) {
      throw ApiError.conflict('任务名称已存在');
    }
  }

  // 构建更新语句
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'parameters') {
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
    `UPDATE ai_tasks 
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

// 删除任务
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  // 检查任务是否存在
  const existingTask = await query(
    'SELECT id FROM ai_tasks WHERE id = $1',
    [id]
  );

  if (existingTask.rows.length === 0) {
    throw ApiError.notFound('AI任务未找到');
  }

  // 检查是否有正在运行的操作
  const runningOperations = await query(
    "SELECT COUNT(*) FROM ai_operations WHERE task_id = $1 AND status = 'running'",
    [id]
  );

  if (parseInt(runningOperations.rows[0].count) > 0) {
    throw ApiError.badRequest('任务有正在运行的操作，无法删除');
  }

  await query('DELETE FROM ai_tasks WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'AI任务已删除',
  });
});

// 执行任务
router.post('/:id/execute', authenticate, authorize('admin', 'user'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { server_id } = req.body;
  const userId = req.user!.id;

  // 检查任务是否存在
  const taskResult = await query(
    'SELECT * FROM ai_tasks WHERE id = $1',
    [id]
  );

  if (taskResult.rows.length === 0) {
    throw ApiError.notFound('AI任务未找到');
  }

  const task = taskResult.rows[0];

  if (!task.is_enabled) {
    throw ApiError.badRequest('任务已禁用');
  }

  // 检查服务器是否存在
  const serverResult = await query(
    'SELECT * FROM servers WHERE id = $1',
    [server_id]
  );

  if (serverResult.rows.length === 0) {
    throw ApiError.notFound('服务器未找到');
  }

  const server = serverResult.rows[0];

  if (server.status === 'offline') {
    throw ApiError.badRequest('服务器离线');
  }

  // 创建操作记录
  const operationResult = await query(
    `INSERT INTO ai_operations (task_id, server_id, operation_type, title, description, ai_prompt, status, started_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
     RETURNING *`,
    [
      id,
      server_id,
      task.task_type,
      `执行任务: ${task.name}`,
      task.description,
      task.prompt_template.replace('{{server_name}}', server.name),
      'running',
      userId,
    ]
  );

  const operation = operationResult.rows[0];

  // 通知WebSocket客户端
  emitToTask(id, 'task:started', {
    task_id: id,
    server_id,
    operation_id: operation.id,
  });

  // TODO: 这里应该调用AI服务执行任务
  // 目前返回模拟结果
  setTimeout(async () => {
    await query(
      `UPDATE ai_operations 
       SET status = 'success', 
           ai_response = '任务执行完成',
           ai_confidence = 0.95,
           completed_at = NOW(),
           execution_time = 5000
       WHERE id = $1`,
      [operation.id]
    );

    emitToTask(id, 'task:completed', {
      task_id: id,
      server_id,
      operation_id: operation.id,
    });
  }, 5000);

  res.json({
    success: true,
    data: operation,
  });
});

// 获取任务统计
router.get('/stats/overview', authenticate, async (req: Request, res: Response) => {
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_tasks,
      COUNT(*) FILTER (WHERE is_enabled = true) as enabled_tasks,
      COUNT(*) FILTER (WHERE task_type = 'maintenance') as maintenance_tasks,
      COUNT(*) FILTER (WHERE task_type = 'monitoring') as monitoring_tasks,
      COUNT(*) FILTER (WHERE task_type = 'optimization') as optimization_tasks,
      COUNT(*) FILTER (WHERE task_type = 'security') as security_tasks
    FROM ai_tasks
  `);

  res.json({
    success: true,
    data: statsResult.rows[0],
  });
});

export default router;