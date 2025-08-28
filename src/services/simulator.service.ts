import { PrismaClient, Simulator } from '@prisma/client';

const prisma = new PrismaClient();

export class SimulatorService {
  async createSimulator(name: string): Promise<Simulator> {
    return prisma.simulator.create({
      data: { name },
    });
  }

  async listSimulators(): Promise<Simulator[]> {
    return prisma.simulator.findMany({
      include: {
        Players: true,
        Queue: true,
      },
    });
  }

  async getSimulatorById(id: number): Promise<Simulator | null> {
    return prisma.simulator.findUnique({
      where: { id },
      include: { Players: true, Queue: true },
    });
  }

  async updateSimulator(id: number, name: string, active?: boolean): Promise<Simulator> {
    return prisma.simulator.update({
      where: { id },
      data: { name, active },
    });
  }

  async deleteSimulator(id: number): Promise<void> {
    await prisma.simulator.delete({ where: { id } });
  }

  async setActive(id: number, active: boolean): Promise<Simulator> {
    return prisma.simulator.update({
      where: { id },
      data: { active },
    });
  }
}
