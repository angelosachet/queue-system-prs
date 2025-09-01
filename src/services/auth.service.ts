import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = (global as any).prisma ?? new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  /**
   * Registra um novo usuário
   */
  async register(
    name: string, 
    email: string, 
    password: string, 
    role: UserRole = UserRole.PLAYER,
    sellerId?: number
  ): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Verifica se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Valida seller se fornecido
    if (sellerId) {
      const seller = await prisma.user.findFirst({
        where: { id: sellerId, role: UserRole.SELLER }
      });
      
      if (!seller) {
        throw new Error('Invalid seller ID');
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        sellerId: role === UserRole.PLAYER ? sellerId : undefined
      }
    });

    // Gera token
    const token = this.generateToken(user.id, user.role);

    // Remove senha do retorno
    const { password: _, ...userWithoutPassword } = user;
    
    return { user: userWithoutPassword, token };
  }

  /**
   * Login do usuário
   */
  async login(email: string, password: string): Promise<{ user: Omit<User, 'password'>, token: string }> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  /**
   * Gera JWT token
   */
  generateToken(userId: number, role: UserRole): string {
    return jwt.sign(
      { userId, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verifica JWT token
   */
  verifyToken(token: string): { userId: number, role: UserRole } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { userId: decoded.userId, role: decoded.role };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Lista sellers para indicação
   */
  async getSellers(): Promise<Omit<User, 'password'>[]> {
    const sellers = await prisma.user.findMany({
      where: { role: UserRole.SELLER },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
        instagram: true,
        inQueue: true,
        sellerId: true,
        simulatorId: true
      }
    });

    return sellers;
  }

  /**
   * Verifica se já existe usuário master
   */
  async checkMasterExists(): Promise<boolean> {
    const master = await prisma.user.findFirst({
      where: { role: UserRole.MASTER }
    });
    return !!master;
  }
}