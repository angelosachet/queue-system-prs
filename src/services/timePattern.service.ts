import { PrismaClient, TimePattern } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};

export class TimePatternService {
  async create(name: string, timeMinutes: number, price: number): Promise<TimePattern> {
    const prisma = getPrismaClient();
    return prisma.timePattern.create({
      data: { name, timeMinutes, price }
    });
  }

  async findAll(): Promise<TimePattern[]> {
    const prisma = getPrismaClient();
    return prisma.timePattern.findMany({
      where: { active: true },
      orderBy: { timeMinutes: 'asc' }
    });
  }

  async findById(id: number): Promise<TimePattern | null> {
    const prisma = getPrismaClient();
    return prisma.timePattern.findUnique({ where: { id } });
  }

  async update(id: number, name: string, timeMinutes: number, price: number): Promise<TimePattern> {
    const prisma = getPrismaClient();
    return prisma.timePattern.update({
      where: { id },
      data: { name, timeMinutes, price }
    });
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.timePattern.update({
      where: { id },
      data: { active: false }
    });
  }
}