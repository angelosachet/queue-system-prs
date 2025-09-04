import { PrismaClient, Simulator, Prisma } from "@prisma/client";

// Use global Prisma instance if available, otherwise create new one
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};

export class SimulatorService {
  /**
   * Creates a new simulator
   */
  async createSimulator(name: string, pcIp?: string): Promise<Simulator> {
    const prisma = getPrismaClient();
    return prisma.simulator.create({
      data: { name, pcIp },
      include: {
        Queue: true
      }
    });
  }

  /**
   * Retrieves all simulators with their players and queue details
   */
  async listSimulators(): Promise<Simulator[]> {
    const prisma = getPrismaClient();
    return prisma.simulator.findMany({
      include: {
        Users: true,
        Queue: {
          include: {
            User: true
          }
        },
      },
    });
  }

  /**
   * Retrieves a specific simulator by ID with players and queue details
   */
  async getSimulatorById(id: number): Promise<Simulator | null> {
    const prisma = getPrismaClient();
    return prisma.simulator.findUnique({
      where: { id },
      include: { 
        Users: true, 
        Queue: {
          include: {
            User: true
          }
        } 
      },
    });
  }

  /**
   * Updates simulator name, active status, and/or PC IP
   */
  async updateSimulator(
    id: number,
    name: string,
    active?: boolean,
    pcIp?: string
  ): Promise<Simulator> {
    const prisma = getPrismaClient();
    const updateData: any = { name };
    if (active !== undefined) updateData.active = active;
    if (pcIp !== undefined) updateData.pcIp = pcIp;
    
    return prisma.simulator.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Deletes simulator and all associated data in correct order
   */
  async deleteSimulator(id: number): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete queue entries first (foreign key dependency)
      await tx.queue.deleteMany({ where: { SimulatorId: id } });
      // Delete users associated with this simulator
      await tx.user.updateMany({ where: { simulatorId: id }, data: { simulatorId: null } });
      // Finally delete the simulator
      await tx.simulator.delete({ where: { id } });
    });
  }

  /**
   * Sets simulator active/inactive status
   */
  async setActive(id: number, active: boolean): Promise<Simulator> {
    const prisma = getPrismaClient();
    return prisma.simulator.update({
      where: { id },
      data: { active },
    });
  }
}
