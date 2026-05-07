import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// 验证模式
const updateConfigSchema = z.object({
  config_value: z.any(),
  description: z.string().optional(),
});

// 获取所有配置
router.get('/', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM system_config ORDER BY config_key'
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

// 获取单个配置
router.get('/:key', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { key } = req.params;

  const result = await query(
    'SELECT * FROM system_config WHERE config_key = $1',
    [key]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('配置项未找到');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// 更新配置
router.put('/:key', authenticate, authorize('admin'), validateBody(updateConfigSchema), async (req: Request, res: Response) => {
  const { key } = req.params;
  const { config_value, description } = req.body;
  const userId = req.user!.id;

  // 检查配置是否存在
  const existingConfig = await query(
    'SELECT id FROM system_config WHERE config_key = $1',
    [key]
  );

  if (existingConfig.rows.length === 0) {
    // 创建新配置
    const result = await query(
      `INSERT INTO system_config (config_key, config_value, description, updated_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [key, JSON.stringify(config_value), description, userId]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } else {
    // 更新现有配置
    const result = await query(
      `UPDATE system_config 
       SET config_value = $1, 
           description = COALESCE($2, description),
           updated_by = $3,
           updated_at = NOW()
       WHERE config_key = $4
       RETURNING *`,
      [JSON.stringify(config_value), description, userId, key]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  }
});

// 删除配置
router.delete('/:key', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { key } = req.params;

  const result = await query(
    'DELETE FROM system_config WHERE config_key = $1 RETURNING id',
    [key]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('配置项未找到');
  }

  res.json({
    success: true,
    message: '配置项已删除',
  });
});

// 批量更新配置
router.put('/', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const { configs } = req.body;
  const userId = req.user!.id;

  if (!Array.isArray(configs)) {
    throw ApiError.badRequest('configs必须是数组');
  }

  const results = [];

  for (const config of configs) {
    const { config_key, config_value, description } = config;

    if (!config_key || config_value === undefined) {
      continue;
    }

    const result = await query(
      `INSERT INTO system_config (config_key, config_value, description, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (config_key) DO UPDATE SET
         config_value = EXCLUDED.config_value,
         description = COALESCE(EXCLUDED.description, system_config.description),
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [config_key, JSON.stringify(config_value), description, userId]
    );

    results.push(result.rows[0]);
  }

  res.json({
    success: true,
    data: results,
  });
});

// 获取AI配置
router.get('/ai/settings', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT config_key, config_value 
     FROM system_config 
     WHERE config_key LIKE 'ai_%'`
  );

  const aiConfig: Record<string, any> = {};
  result.rows.forEach((row: any) => {
    aiConfig[row.config_key] = row.config_value;
  });

  res.json({
    success: true,
    data: aiConfig,
  });
});

// 更新AI配置
router.put('/ai/settings', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  const aiConfig = req.body;
  const userId = req.user!.id;

  const results = [];

  for (const [key, value] of Object.entries(aiConfig)) {
    if (!key.startsWith('ai_')) {
      continue;
    }

    const result = await query(
      `INSERT INTO system_config (config_key, config_value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (config_key) DO UPDATE SET
         config_value = EXCLUDED.config_value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value), userId]
    );

    results.push(result.rows[0]);
  }

  res.json({
    success: true,
    data: results,
  });
});

export default router;