import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/auth';

const router = Router();

// 验证模式
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  full_name: z.string().optional(),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
  is_active: z.boolean().optional(),
});

const userQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  search: z.string().optional(),
  role: z.string().optional(),
  is_active: z.string().transform((val) => val === 'true').optional(),
});

// 获取用户列表
router.get('/', authenticate, authorize('admin'), validateQuery(userQuerySchema), async (req: Request, res: Response) => {
  const { page, limit, search, role, is_active } = req.query as any;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (role) {
    whereClause += ` AND role = $${paramIndex}`;
    params.push(role);
    paramIndex++;
  }

  if (is_active !== undefined) {
    whereClause += ` AND is_active = $${paramIndex}`;
    params.push(is_active);
    paramIndex++;
  }

  // 获取总数
  const countResult = await query(
    `SELECT COUNT(*) FROM users ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // 获取用户列表
  const result = await query(
    `SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
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

// 获取用户详情
router.get('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    'SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('用户未找到');
  }

  // 获取用户活动统计
  const statsResult = await query(
    `SELECT 
       COUNT(*) as total_operations,
       COUNT(*) FILTER (WHERE status = 'success') as success_operations,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as month_operations
     FROM ai_operations
     WHERE created_by = $1`,
    [id]
  );

  const user = result.rows[0];
  user.stats = statsResult.rows[0];

  res.json({
    success: true,
    data: user,
  });
});

// 创建用户
router.post('/', authenticate, authorize('admin'), validateBody(createUserSchema), async (req: Request, res: Response) => {
  const { username, email, password, full_name, role } = req.body;

  // 检查用户名是否已存在
  const existingUsername = await query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );

  if (existingUsername.rows.length > 0) {
    throw ApiError.conflict('用户名已存在');
  }

  // 检查邮箱是否已存在
  const existingEmail = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingEmail.rows.length > 0) {
    throw ApiError.conflict('邮箱已存在');
  }

  // 加密密码
  const passwordHash = await hashPassword(password);

  // 创建用户
  const result = await query(
    `INSERT INTO users (username, email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, full_name, role, is_active, created_at`,
    [username, email, passwordHash, full_name, role]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

// 更新用户
router.put('/:id', authenticate, authorize('admin'), validateBody(updateUserSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // 检查用户是否存在
  const existingUser = await query(
    'SELECT id FROM users WHERE id = $1',
    [id]
  );

  if (existingUser.rows.length === 0) {
    throw ApiError.notFound('用户未找到');
  }

  // 检查邮箱是否冲突
  if (updateData.email) {
    const emailConflict = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [updateData.email, id]
    );

    if (emailConflict.rows.length > 0) {
      throw ApiError.conflict('邮箱已存在');
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
    `UPDATE users 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, username, email, full_name, role, is_active, last_login, created_at, updated_at`,
    updateValues
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// 删除用户
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  // 检查用户是否存在
  const existingUser = await query(
    'SELECT id, username FROM users WHERE id = $1',
    [id]
  );

  if (existingUser.rows.length === 0) {
    throw ApiError.notFound('用户未找到');
  }

  // 不能删除自己
  if (req.user!.id === id) {
    throw ApiError.badRequest('不能删除自己的账户');
  }

  // 检查用户是否有关联的数据
  const operationsResult = await query(
    'SELECT COUNT(*) FROM ai_operations WHERE created_by = $1',
    [id]
  );

  if (parseInt(operationsResult.rows[0].count) > 0) {
    throw ApiError.badRequest('用户存在关联的操作记录，无法删除');
  }

  await query('DELETE FROM users WHERE id = $1', [id]);

  res.json({
    success: true,
    message: '用户已删除',
  });
});

// 重置用户密码
router.post('/:id/reset-password', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    throw ApiError.badRequest('新密码至少6个字符');
  }

  // 检查用户是否存在
  const existingUser = await query(
    'SELECT id FROM users WHERE id = $1',
    [id]
  );

  if (existingUser.rows.length === 0) {
    throw ApiError.notFound('用户未找到');
  }

  // 加密新密码
  const passwordHash = await hashPassword(new_password);

  // 更新密码
  await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [passwordHash, id]
  );

  res.json({
    success: true,
    message: '密码已重置',
  });
});

// 获取用户活动日志
router.get('/:id/activity', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 20 } = req.query;

  // 检查用户是否存在
  const existingUser = await query(
    'SELECT id FROM users WHERE id = $1',
    [id]
  );

  if (existingUser.rows.length === 0) {
    throw ApiError.notFound('用户未找到');
  }

  const result = await query(
    `SELECT al.*, 
            u.username
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.user_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2`,
    [id, Number(limit)]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

export default router;