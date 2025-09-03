import { PrismaClient, User } from '@prisma/client';
import { eventService } from './event.service';

// Use global prisma in tests, otherwise create new instance
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};

export class PlayerService {
  async create(name: string, email: string, phone?: string, sellerId?: number): Promise<User> {
    const prisma = getPrismaClient();
    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    const user = await prisma.user.create({ 
      data: { 
        name, 
        email, 
        phone,
        sellerId,
        password: 'temp',
        role: 'PLAYER'
      } 
    });

    // Emit event for player creation
    eventService.emit('player.created', {
      playerId: user.id,
      playerName: user.name,
      sellerId
    });

    return user;
  }

  async findAll(email?: string): Promise<User[]> {
    const prisma = getPrismaClient();
    const where = email ? { email, role: 'PLAYER' } : { role: 'PLAYER' };
    return prisma.user.findMany({ 
      where,
      orderBy: { createdAt: 'asc' } 
    });
  }

  async findById(id: number): Promise<User | null> {
    const prisma = getPrismaClient();
    return prisma.user.findUnique({ 
      where: { id }
    });
  }

  async update(id: number, name: string, email?: string, phone?: string, sellerId?: number): Promise<User> {
    const prisma = getPrismaClient();
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
    
    const updatedUser = await prisma.user.update({ where: { id }, data: updateData });

    // Emit event for player update
    eventService.emit('player.updated', {
      playerId: id,
      playerName: updatedUser.name
    });

    return updatedUser;
  }

  async delete(id: number): Promise<User> {
    const prisma = getPrismaClient();
    return prisma.user.delete({ where: { id } });
  }
}
