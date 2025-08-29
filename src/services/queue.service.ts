// service/queue.service.ts
import { Queue, Player, Simulator } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { eventService } from "./event.service";

// usa global.prisma se existir
const prismaClient = global.prisma ?? new PrismaClient();
const prisma = prismaClient;

export class QueueService {
  async addPlayerToQueue(
    playerId: number,
    simulatorId: number
  ): Promise<Queue & { Player: Player; Simulator: Simulator }> {
    const [player, simulator] = await Promise.all([
      prismaClient.player.findUnique({ where: { id: playerId } }),
      prismaClient.simulator.findUnique({ 
        where: { id: simulatorId },
        include: { Queue: true }
      })
    ]);
    
    if (!player) throw new Error("Player not found");
    if (!simulator) throw new Error("Simulator not found");

    const count = await prismaClient.queue.count({
      where: { SimulatorId: simulatorId },
    });

    const queueItem = await prismaClient.queue.create({
      data: {
        PlayerId: playerId,
        SimulatorId: simulatorId,
        position: count + 1,
      },
      include: { Player: true, Simulator: true },
    });

    eventService.emit('queue.playerAdded', {
      playerId,
      simulatorId,
      position: queueItem.position,
      queueId: queueItem.id
    });

    return queueItem;
  }

  async createQueue(PlayerId: number, SimulatorId: number): Promise<Queue> {
    // busca a última posição da fila desse simulador
    const lastInQueue = await prisma.queue.findFirst({
      where: { SimulatorId },
      orderBy: { position: "desc" },
    });

    const newPosition = lastInQueue ? lastInQueue.position + 1 : 1;

    // cria nova entrada
    return prisma.queue.create({
      data: {
        PlayerId,
        SimulatorId,
        position: newPosition,
      },
    });
  }

  async getQueue(simulatorId: number): Promise<(Queue & { Player: Player })[]> {
    return prismaClient.queue.findMany({
      where: { SimulatorId: simulatorId },
      include: { Player: true },
      orderBy: { position: "asc" },
    });
  }

  async removePlayerFromQueue(queueId: number): Promise<void> {
    const queueItem = await prismaClient.queue.findUnique({
      where: { id: queueId },
    });
    if (!queueItem) throw new Error("Queue item not found");

    const simulatorId = queueItem.SimulatorId;
    const position = queueItem.position;

    await prismaClient.$transaction([
      prismaClient.queue.delete({ where: { id: queueId } }),
      prismaClient.queue.updateMany({
        where: { SimulatorId: simulatorId, position: { gt: position } },
        data: { position: { decrement: 1 } },
      }),
    ]);

    eventService.emit('queue.playerRemoved', {
      playerId: queueItem.PlayerId,
      simulatorId,
      position,
      queueId
    });
  }

  async getAllQueues() {
    return prisma.queue.findMany({
      include: { Player: true, Simulator: true },
    });
  }

  async movePlayer(
    queueId: number,
    newPosition: number
  ): Promise<Queue & { Player: Player; Simulator: Simulator }> {
    const queueItem = await prismaClient.queue.findUnique({
      where: { id: queueId },
    });
    if (!queueItem) throw new Error("Queue item not found");

    const simulatorId = queueItem.SimulatorId;
    const oldPosition = queueItem.position;

    if (newPosition === oldPosition) {
      const updated = await prismaClient.queue.findUnique({
        where: { id: queueId },
        include: { Player: true, Simulator: true },
      });
      if (!updated) throw new Error("Queue item not found after move");
      return updated;
    }

    if (newPosition < oldPosition) {
      await prismaClient.$transaction([
        prismaClient.queue.updateMany({
          where: {
            SimulatorId: simulatorId,
            position: { gte: newPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        }),
        prismaClient.queue.update({
          where: { id: queueId },
          data: { position: newPosition },
        }),
      ]);
    } else {
      await prismaClient.$transaction([
        prismaClient.queue.updateMany({
          where: {
            SimulatorId: simulatorId,
            position: { lte: newPosition, gt: oldPosition },
          },
          data: { position: { decrement: 1 } },
        }),
        prismaClient.queue.update({
          where: { id: queueId },
          data: { position: newPosition },
        }),
      ]);
    }

    const updated = await prismaClient.queue.findUnique({
      where: { id: queueId },
      include: { Player: true, Simulator: true },
    });
    if (!updated) throw new Error("Queue item not found after move");
    return updated;
  }
}
