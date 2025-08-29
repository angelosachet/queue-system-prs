import { PrismaClient, Player } from '@prisma/client';

// Use global prisma in tests, otherwise create new instance
const prisma = (global as any).prisma || new PrismaClient();

export class PlayerService {
  async create(name: string): Promise<Player> {
    return prisma.player.create({ data: { name } });
  }

  async findAll(): Promise<Player[]> {
    return prisma.player.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findById(id: number): Promise<Player | null> {
    return prisma.player.findUnique({ where: { id } });
  }

  async update(id: number, name: string): Promise<Player> {
    return prisma.player.update({ where: { id }, data: { name } });
  }

  async delete(id: number): Promise<Player> {
    return prisma.player.delete({ where: { id } });
  }
}
