import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, TokenPayload } from '../utils/auth';
import { ApiError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw ApiError.unauthorized('未提供认证令牌');
    }

    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized('未认证');
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('权限不足');
    }

    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (token) {
    try {
      verifyToken(token).then((decoded) => {
        req.user = decoded;
        next();
      }).catch(() => {
        next();
      });
    } catch (error) {
      next();
    }
  } else {
    next();
  }
}