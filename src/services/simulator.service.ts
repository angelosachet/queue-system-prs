import { PrismaClient, Simulator, Prisma } from "@prisma/client";

const prisma = (global as any).prisma ?? new PrismaClient();

export class SimulatorService {
  async createSimulator(name: string): Promise<Simulator> {
    return prisma.simulator.create({
      data: { 
        name,
        Queue: {
          create: {
            position: 0,
            Player: {
              create: {
                name: 'Dummy Player',
                inQueue: true
              }
            }
          }
        }
      },
      include: {
        Queue: true
      }
    });
  }

  async listSimulators(): Promise<Simulator[]> {
    return prisma.simulator.findMany({
      include: {
        Players: true,
        Queue: {
          include: {
            Player: true
          }
        },
      },
    });
  }

  async getSimulatorById(id: number): Promise<Simulator | null> {
    return prisma.simulator.findUnique({
      where: { id },
      include: { 
        Players: true, 
        Queue: {
          include: {
            Player: true
          }
        } 
      },
    });
  }

  async updateSimulator(
    id: number,
    name: string,
    active?: boolean
  ): Promise<Simulator> {
    return prisma.simulator.update({
      where: { id },
      data: { name, active },
    });
  }

  async deleteSimulator(id: number): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete queue entries first
      await tx.queue.deleteMany({ where: { SimulatorId: id } });
      // Delete players associated with this simulator
      await tx.player.deleteMany({ where: { simulatorId: id } });
      // Finally delete the simulator
      await tx.simulator.delete({ where: { id } });
    });
  }

  async setActive(id: number, active: boolean): Promise<Simulator> {
    return prisma.simulator.update({
      where: { id },
      data: { active },
    });
  }
}
