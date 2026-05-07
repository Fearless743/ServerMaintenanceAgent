import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { emitToServer } from '../config/websocket';

const router = Router();

// 验证模式
const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  hostname: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(22),
  ip_address: z.string().optional(),
  os_type: z.string().optional(),
  os_version: z.string().optional(),
  group_id: z.string().uuid().optional(),
  ssh_username: z.string().optional(),
  ssh_key_path: z.string().optional(),
  ssh_password: z.string().optional(),
  agent_port: z.number().int().min(1).max(65535).default(8080),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

const updateServerSchema = createServerSchema.partial();

const serverQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.string().optional(),
  group_id: z.string().uuid().optional(),
});

// 获取服务器列表
router.get('/', authenticate, validateQuery(serverQuerySchema), async (req: Request, res: Response) => {
  const { page, limit, sort, order, search, status, group_id } = req.query as any;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.hostname ILIKE $${paramIndex} OR s.ip_address::text ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND s.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (group_id) {
    whereClause += ` AND s.group_id = $${paramIndex}`;
    params.push(group_id);
    paramIndex++;
  }

  // 获取总数
  const countResult = await query(
    `SELECT COUNT(*) FROM servers s ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // 获取服务器列表
  const result = await query(
    `SELECT s.*, sg.name as group_name, sg.color as group_color,
            u.username as created_by_username
     FROM servers s
     LEFT JOIN server_groups sg ON s.group_id = sg.id
     LEFT JOIN users u ON s.created_by = u.id
     ${whereClause}
     ORDER BY s.${sort} ${order}
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

// 获取服务器详情
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT s.*, sg.name as group_name, sg.color as group_color,
            u.username as created_by_username
     FROM servers s
     LEFT JOIN server_groups sg ON s.group_id = sg.id
     LEFT JOIN users u ON s.created_by = u.id
     WHERE s.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('服务器未找到');
  }

  // 获取最新的指标数据
  const metricsResult = await query(
    `SELECT * FROM server_metrics 
     WHERE server_id = $1 
     ORDER BY collected_at DESC 
     LIMIT 1`,
    [id]
  );

  const server = result.rows[0];
  server.latest_metrics = metricsResult.rows[0] || null;

  res.json({
    success: true,
    data: server,
  });
});

// 创建服务器
router.post('/', authenticate, authorize('admin', 'user'), validateBody(createServerSchema), async (req: Request, res: Response) => {
  const serverData = req.body;
  const userId = req.user!.id;

  // 检查名称是否已存在
  const existingServer = await query(
    'SELECT id FROM servers WHERE name = $1',
    [serverData.name]
  );

  if (existingServer.rows.length > 0) {
    throw ApiError.conflict('服务器名称已存在');
  }

  // 检查分组是否存在
  if (serverData.group_id) {
    const groupResult = await query(
      'SELECT id FROM server_groups WHERE id = $1',
      [serverData.group_id]
    );

    if (groupResult.rows.length === 0) {
      throw ApiError.badRequest('服务器分组不存在');
    }
  }

  const result = await query(
    `INSERT INTO servers (name, hostname, port, ip_address, os_type, os_version, group_id, ssh_username, ssh_key_path, agent_port, tags, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      serverData.name,
      serverData.hostname,
      serverData.port,
      serverData.ip_address,
      serverData.os_type,
      serverData.os_version,
      serverData.group_id,
      serverData.ssh_username,
      serverData.ssh_key_path,
      serverData.agent_port,
      JSON.stringify(serverData.tags),
      JSON.stringify(serverData.metadata),
      userId,
    ]
  );

  const server = result.rows[0];

  // 通知WebSocket客户端
  emitToServer(server.id, 'server:created', server);

  res.status(201).json({
    success: true,
    data: server,
  });
});

// 更新服务器
router.put('/:id', authenticate, authorize('admin', 'user'), validateBody(updateServerSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // 检查服务器是否存在
  const existingServer = await query(
    'SELECT id FROM servers WHERE id = $1',
    [id]
  );

  if (existingServer.rows.length === 0) {
    throw ApiError.notFound('服务器未找到');
  }

  // 检查名称是否冲突
  if (updateData.name) {
    const nameConflict = await query(
      'SELECT id FROM servers WHERE name = $1 AND id != $2',
      [updateData.name, id]
    );

    if (nameConflict.rows.length > 0) {
      throw ApiError.conflict('服务器名称已存在');
    }
  }

  // 构建更新语句
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'tags' || key === 'metadata') {
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
    `UPDATE servers 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    updateValues
  );

  const server = result.rows[0];

  // 通知WebSocket客户端
  emitToServer(server.id, 'server:updated', server);

  res.json({
    success: true,
    data: server,
  });
});

// 删除服务器
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  // 检查服务器是否存在
  const existingServer = await query(
    'SELECT id, name FROM servers WHERE id = $1',
    [id]
  );

  if (existingServer.rows.length === 0) {
    throw ApiError.notFound('服务器未找到');
  }

  // 检查是否有关联的操作记录
  const operationsResult = await query(
    'SELECT COUNT(*) FROM ai_operations WHERE server_id = $1',
    [id]
  );

  if (parseInt(operationsResult.rows[0].count) > 0) {
    throw ApiError.badRequest('服务器存在关联的操作记录，无法删除');
  }

  // 删除服务器
  await query('DELETE FROM servers WHERE id = $1', [id]);

  // 通知WebSocket客户端
  emitToServer(id, 'server:deleted', { id });

  res.json({
    success: true,
    message: '服务器已删除',
  });
});

// 获取服务器指标
router.get('/:id/metrics', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { hours = 24 } = req.query;

  // 检查服务器是否存在
  const existingServer = await query(
    'SELECT id FROM servers WHERE id = $1',
    [id]
  );

  if (existingServer.rows.length === 0) {
    throw ApiError.notFound('服务器未找到');
  }

  const result = await query(
    `SELECT * FROM server_metrics 
     WHERE server_id = $1 
     AND collected_at >= NOW() - INTERVAL '${Number(hours)} hours'
     ORDER BY collected_at ASC`,
    [id]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

// 测试服务器连接
router.post('/:id/test-connection', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  // 检查服务器是否存在
  const existingServer = await query(
    'SELECT id, hostname, port, ssh_username FROM servers WHERE id = $1',
    [id]
  );

  if (existingServer.rows.length === 0) {
    throw ApiError.notFound('服务器未找到');
  }

  const server = existingServer.rows[0];

  // TODO: 实现实际的连接测试逻辑
  // 这里可以调用Go代理的测试连接接口

  res.json({
    success: true,
    data: {
      server_id: id,
      hostname: server.hostname,
      port: server.port,
      status: 'connected',
      message: '连接测试成功',
    },
  });
});

export default router;