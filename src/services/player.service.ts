import { PrismaClient, Player } from '@prisma/client';

const prisma = new PrismaClient();

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
