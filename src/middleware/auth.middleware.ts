import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        role: UserRole;
      };
    }
  }
}

/**
 * Middleware de autenticação básica
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware para verificar roles específicas
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware para master apenas
 */
export const masterOnly = authorize(UserRole.MASTER);

/**
 * Middleware para admin e master
 */
export const adminOrMaster = authorize(UserRole.ADMIN, UserRole.MASTER);

/**
 * Middleware para seller, admin e master
 */
export const sellerOrAbove = authorize(UserRole.SELLER, UserRole.ADMIN, UserRole.MASTER);