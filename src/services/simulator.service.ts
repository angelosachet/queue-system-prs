import { PrismaClient, Simulator, Prisma } from "@prisma/client";

// Use global Prisma instance if available, otherwise create new one
const prisma = (global as any).prisma ?? new PrismaClient();

export class SimulatorService {
  /**
   * Creates a new simulator with a dummy player in queue at position 0
   */
  async createSimulator(name: string): Promise<Simulator> {
    return prisma.simulator.create({
      data: { 
        name,
        // Create initial queue entry with dummy player
        // Queue: {
        //   create: {
        //     position: 0,
        //     Player: {
        //       create: {
        //         name: 'Dummy Player',
        //         inQueue: true
        //       }
        //     }
        //   }
        // }
      },
      include: {
        Queue: true
      }
    });
  }

  /**
   * Retrieves all simulators with their players and queue details
   */
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

  /**
   * Retrieves a specific simulator by ID with players and queue details
   */
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

  /**
   * Updates simulator name and/or active status
   */
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

  /**
   * Deletes simulator and all associated data in correct order
   */
  async deleteSimulator(id: number): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete queue entries first (foreign key dependency)
      await tx.queue.deleteMany({ where: { SimulatorId: id } });
      // Delete players associated with this simulator
      await tx.player.deleteMany({ where: { simulatorId: id } });
      // Finally delete the simulator
      await tx.simulator.delete({ where: { id } });
    });
  }

  /**
   * Sets simulator active/inactive status
   */
  async setActive(id: number, active: boolean): Promise<Simulator> {
    return prisma.simulator.update({
      where: { id },
      data: { active },
    });
  }
}
