import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// 验证模式
const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  icon: z.string().default('server'),
});

const updateGroupSchema = createGroupSchema.partial();

// 获取分组列表
router.get('/', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT sg.*, 
            COUNT(s.id) as server_count,
            u.username as created_by_username
     FROM server_groups sg
     LEFT JOIN servers s ON sg.id = s.group_id
     LEFT JOIN users u ON sg.created_by = u.id
     GROUP BY sg.id, u.username
     ORDER BY sg.name`
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

// 获取分组详情
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT sg.*, 
            COUNT(s.id) as server_count,
            u.username as created_by_username
     FROM server_groups sg
     LEFT JOIN servers s ON sg.id = s.group_id
     LEFT JOIN users u ON sg.created_by = u.id
     WHERE sg.id = $1
     GROUP BY sg.id, u.username`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('服务器分组未找到');
  }

  // 获取分组下的服务器列表
  const serversResult = await query(
    `SELECT id, name, hostname, status, agent_status
     FROM servers
     WHERE group_id = $1
     ORDER BY name`,
    [id]
  );

  const group = result.rows[0];
  group.servers = serversResult.rows;

  res.json({
    success: true,
    data: group,
  });
});

// 创建分组
router.post('/', authenticate, authorize('admin', 'user'), validateBody(createGroupSchema), async (req: Request, res: Response) => {
  const groupData = req.body;
  const userId = req.user!.id;

  // 检查名称是否已存在
  const existingGroup = await query(
    'SELECT id FROM server_groups WHERE name = $1',
    [groupData.name]
  );

  if (existingGroup.rows.length > 0) {
    throw ApiError.conflict('分组名称已存在');
  }

  const result = await query(
    `INSERT INTO server_groups (name, description, color, icon, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      groupData.name,
      groupData.description,
      groupData.color,
      groupData.icon,
      userId,
    ]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

// 更新分组
router.put('/:id', authenticate, authorize('admin', 'user'), validateBody(updateGroupSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // 检查分组是否存在
  const existingGroup = await query(
    'SELECT id FROM server_groups WHERE id = $1',
    [id]
  );

  if (existingGroup.rows.length === 0) {
    throw ApiError.notFound('服务器分组未找到');
  }

  // 检查名称是否冲突
  if (updateData.name) {
    const nameConflict = await query(
      'SELECT id FROM server_groups WHERE name = $1 AND id != $2',
      [updateData.name, id]
    );

    if (nameConflict.rows.length > 0) {
      throw ApiError.conflict('分组名称已存在');
    }
  }

  // 构建更新语句
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    throw ApiError.badRequest('没有提供更新数据');
  }

  updateValues.push(id);

  const result = await query(
    `UPDATE server_groups 
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

// 删除分组
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  // 检查分组是否存在
  const existingGroup = await query(
    'SELECT id FROM server_groups WHERE id = $1',
    [id]
  );

  if (existingGroup.rows.length === 0) {
    throw ApiError.notFound('服务器分组未找到');
  }

  // 检查分组下是否有服务器
  const serversResult = await query(
    'SELECT COUNT(*) FROM servers WHERE group_id = $1',
    [id]
  );

  if (parseInt(serversResult.rows[0].count) > 0) {
    throw ApiError.badRequest('分组下存在服务器，无法删除');
  }

  // 检查是否有关联的AI任务
  const tasksResult = await query(
    'SELECT COUNT(*) FROM ai_tasks WHERE group_id = $1',
    [id]
  );

  if (parseInt(tasksResult.rows[0].count) > 0) {
    throw ApiError.badRequest('分组下存在AI任务，无法删除');
  }

  await query('DELETE FROM server_groups WHERE id = $1', [id]);

  res.json({
    success: true,
    message: '服务器分组已删除',
  });
});

export default router;