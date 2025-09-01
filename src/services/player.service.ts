import { PrismaClient, Player } from '@prisma/client';

// Use global prisma in tests, otherwise create new instance
const prisma = (global as any).prisma || new PrismaClient();

export class PlayerService {
  async create(name: string, email: string): Promise<Player> {
    // Check if email already exists
    const existingPlayer = await prisma.player.findFirst({
      where: { email }
    });
    
    if (existingPlayer) {
      throw new Error('Email already exists');
    }
    
    return prisma.player.create({ data: { name, email } });
  }

  async findAll(email?: string): Promise<Player[]> {
    const where = email ? { email } : {};
    return prisma.player.findMany({ 
      where,
      orderBy: { createdAt: 'asc' } 
    });
  }

  async findById(id: number): Promise<Player | null> {
    return prisma.player.findUnique({ where: { id } });
  }

  async update(id: number, name: string, email?: string): Promise<Player> {
    const updateData: any = { name };
    
    if (email) {
      // Check if email already exists for another player
      const existingPlayer = await prisma.player.findFirst({
        where: { email, id: { not: id } }
      });
      
      if (existingPlayer) {
        throw new Error('Email already exists');
      }
      
      updateData.email = email;
    }
    
    return prisma.player.update({ where: { id }, data: updateData });
  }

  async delete(id: number): Promise<Player> {
    return prisma.player.delete({ where: { id } });
  }
}
