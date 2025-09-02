import { PrismaClient, User } from '@prisma/client';

// Use global prisma in tests, otherwise create new instance
const prisma = (global as any).prisma || new PrismaClient();

export class PlayerService {
  async create(name: string, email: string, phone?: string, sellerId?: number): Promise<User> {
    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    return prisma.user.create({ 
      data: { 
        name, 
        email, 
        phone,
        sellerId,
        password: 'temp',
        role: 'PLAYER'
      } 
    });
  }

  async findAll(email?: string): Promise<User[]> {
    const where = email ? { email, role: 'PLAYER' } : { role: 'PLAYER' };
    return prisma.user.findMany({ 
      where,
      orderBy: { createdAt: 'asc' } 
    });
  }

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ 
      where: { id }
    });
  }

  async update(id: number, name: string, email?: string, phone?: string, sellerId?: number): Promise<User> {
    const updateData: any = { name };
    
    if (email) {
      // Check if email already exists for another user
      const existingUser = await prisma.user.findFirst({
        where: { email, id: { not: id } }
      });
      
      if (existingUser) {
        throw new Error('Email already exists');
      }
      
      updateData.email = email;
    }
    
    if (phone !== undefined) updateData.phone = phone;
    if (sellerId !== undefined) updateData.sellerId = sellerId;
    
    return prisma.user.update({ where: { id }, data: updateData });
  }

  async delete(id: number): Promise<User> {
    return prisma.user.delete({ where: { id } });
  }
}
