import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, message: string, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string, details?: any): ApiError {
    return new ApiError(400, message, code || 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = '未授权'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message: string = '禁止访问'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message: string = '资源未找到'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string, details?: any): ApiError {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  static validationError(message: string, details?: any): ApiError {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static internal(message: string = '服务器内部错误'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }

  static serviceUnavailable(message: string = '服务不可用'): ApiError {
    return new ApiError(503, message, 'SERVICE_UNAVAILABLE');
  }
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction): void {
  console.error('错误:', err);

  // 如果是ApiError，使用其状态码
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '无效的认证令牌',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: '认证令牌已过期',
      },
    });
    return;
  }

  // 数据库错误
  if (err.code === '23505') { // 唯一约束违反
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: '记录已存在',
        details: err.details,
      },
    });
    return;
  }

  if (err.code === '23503') { // 外键约束违反
    res.status(400).json({
      success: false,
      error: {
        code: 'REFERENCE_ERROR',
        message: '关联记录不存在',
        details: err.details,
      },
    });
    return;
  }

  // 默认服务器错误
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}