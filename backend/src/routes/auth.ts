import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyToken } from '../utils/auth';
import { validateBody } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// 验证模式
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  full_name: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(6).max(100),
});

// 注册
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { username, email, password, full_name } = req.body;

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
     VALUES ($1, $2, $3, $4, 'user')
     RETURNING id, username, email, full_name, role, is_active, created_at`,
    [username, email, passwordHash, full_name]
  );

  const user = result.rows[0];

  // 生成令牌
  const token = generateToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
      refreshToken,
    },
  });
});

// 登录
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // 查找用户
  const result = await query(
    'SELECT * FROM users WHERE username = $1 OR email = $1',
    [username]
  );

  if (result.rows.length === 0) {
    throw ApiError.unauthorized('用户名或密码错误');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw ApiError.unauthorized('账户已禁用');
  }

  // 验证密码
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    throw ApiError.unauthorized('用户名或密码错误');
  }

  // 更新最后登录时间
  await query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [user.id]
  );

  // 生成令牌
  const token = generateToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  // 记录审计日志
  await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent)
     VALUES ($1, 'login', 'user', $2, $3, $4)`,
    [
      user.id,
      JSON.stringify({ login_time: new Date() }),
      req.ip,
      req.headers['user-agent'],
    ]
  );

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at,
      },
      token,
      refreshToken,
    },
  });
});

// 刷新令牌
router.post('/refresh-token', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest('未提供刷新令牌');
  }

  try {
    const decoded = await verifyToken(refreshToken);

    // 检查用户是否存在
    const result = await query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw ApiError.unauthorized('用户不存在');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw ApiError.unauthorized('账户已禁用');
    }

    // 生成新令牌
    const newToken = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    throw ApiError.unauthorized('无效的刷新令牌');
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const result = await query(
    'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('用户未找到');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// 修改密码
router.put('/change-password', authenticate, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { current_password, new_password } = req.body;

  // 获取当前密码哈希
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('用户未找到');
  }

  // 验证当前密码
  const isValidPassword = await comparePassword(current_password, result.rows[0].password_hash);

  if (!isValidPassword) {
    throw ApiError.badRequest('当前密码错误');
  }

  // 加密新密码
  const newPasswordHash = await hashPassword(new_password);

  // 更新密码
  await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [newPasswordHash, userId]
  );

  // 记录审计日志
  await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent)
     VALUES ($1, 'change_password', 'user', $2, $3, $4)`,
    [userId, JSON.stringify({}), req.ip, req.headers['user-agent']]
  );

  res.json({
    success: true,
    message: '密码已更新',
  });
});

// 登出
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // 记录审计日志
  await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent)
     VALUES ($1, 'logout', 'user', $2, $3, $4)`,
    [userId, JSON.stringify({ logout_time: new Date() }), req.ip, req.headers['user-agent']]
  );

  res.json({
    success: true,
    message: '已登出',
  });
});

export default router;