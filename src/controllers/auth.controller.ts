import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  /**
   * Registro de usuário
   */
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, role, sellerId } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ 
          error: 'Name, email and password are required' 
        });
      }

      // Validação de role
      const validRoles = Object.values(UserRole);
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const result = await authService.register(
        name, 
        email, 
        password, 
        role || UserRole.PLAYER,
        sellerId
      );

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error: any) {
      if (error.message === 'Email already exists') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      if (error.message === 'Invalid seller ID') {
        return res.status(400).json({ error: 'Invalid seller ID' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  /**
   * Login de usuário
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      const result = await authService.login(email, password);

      return res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Perfil do usuário logado
   */
  async profile(req: Request, res: Response) {
    try {
      // req.user é definido pelo middleware de autenticação
      return res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  /**
   * Lista sellers disponíveis para indicação
   */
  async getSellers(req: Request, res: Response) {
    try {
      const sellers = await authService.getSellers();
      
      return res.json({
        success: true,
        data: sellers
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get sellers' });
    }
  }

  /**
   * Cria usuário master com hash key de segurança
   */
  async createMaster(req: Request, res: Response) {
    try {
      const { masterKey, name, email, password } = req.body;
      
      // Verifica hash key
      if (masterKey !== process.env.MASTER_CREATION_KEY) {
        return res.status(403).json({ error: 'Invalid master key' });
      }

      // Verifica se já existe master
      const masterExists = await authService.checkMasterExists();
      if (masterExists) {
        return res.status(409).json({ error: 'Master user already exists' });
      }

      const result = await authService.register(
        name || 'Master Admin',
        email || 'master@simqueue.com', 
        password || 'master123',
        UserRole.MASTER
      );

      return res.status(201).json({
        success: true,
        message: 'Master user created successfully',
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create master user' });
    }
  }
}