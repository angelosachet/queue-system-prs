// service/queue.service.ts
import { Queue, Player, Simulator } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { eventService } from "./event.service";

// Use global Prisma instance if available, otherwise create new one
const prismaClient = global.prisma ?? new PrismaClient();
const prisma = prismaClient;

export class QueueService {
  /**
   * Adds a player to a simulator's queue at the end position
   */
  async addPlayerToQueue(
    playerId: number,
    simulatorId: number
  ): Promise<Queue & { Player: Player; Simulator: Simulator }> {
    // Validate player and simulator exist in parallel
    const [player, simulator] = await Promise.all([
      prismaClient.player.findUnique({ where: { id: playerId } }),
      prismaClient.simulator.findUnique({ 
        where: { id: simulatorId },
        include: { Queue: true }
      })
    ]);
    
    if (!player) throw new Error("Player not found");
    if (!simulator) throw new Error("Simulator not found");

    // Get current queue size to determine new position
    const count = await prismaClient.queue.count({
      where: { SimulatorId: simulatorId },
    });

    // Create queue entry at end of queue
    const queueItem = await prismaClient.queue.create({
      data: {
        PlayerId: playerId,
        SimulatorId: simulatorId,
        position: count + 1,
      },
      include: { Player: true, Simulator: true },
    });

    // Emit event for queue addition
    eventService.emit('queue.playerAdded', {
      playerId,
      simulatorId,
      position: queueItem.position,
      queueId: queueItem.id
    });

    return queueItem;
  }

  /**
   * Creates a queue entry without validation (alternative method)
   */
  async createQueue(PlayerId: number, SimulatorId: number): Promise<Queue> {
    // Find last position in simulator's queue
    const lastInQueue = await prisma.queue.findFirst({
      where: { SimulatorId },
      orderBy: { position: "desc" },
    });

    // Set position as last + 1, or 1 if queue is empty
    const newPosition = lastInQueue ? lastInQueue.position + 1 : 1;

    // Create new queue entry
    return prisma.queue.create({
      data: {
        PlayerId,
        SimulatorId,
        position: newPosition,
      },
    });
  }

  /**
   * Retrieves all players in a simulator's queue ordered by position
   */
  async getQueue(simulatorId: number): Promise<(Queue & { Player: Player })[]> {
    return prismaClient.queue.findMany({
      where: { SimulatorId: simulatorId },
      include: { Player: true },
      orderBy: { position: "asc" },
    });
  }

  /**
   * Removes a player from queue and reorganizes positions
   */
  async removePlayerFromQueue(queueId: number): Promise<void> {
    // Find queue item to remove
    const queueItem = await prismaClient.queue.findUnique({
      where: { id: queueId },
    });
    if (!queueItem) throw new Error("Queue item not found");

    const simulatorId = queueItem.SimulatorId;
    const position = queueItem.position;

    // Delete item and shift remaining positions down in transaction
    await prismaClient.$transaction([
      prismaClient.queue.delete({ where: { id: queueId } }),
      prismaClient.queue.updateMany({
        where: { SimulatorId: simulatorId, position: { gt: position } },
        data: { position: { decrement: 1 } },
      }),
    ]);

    // Emit removal event
    eventService.emit('queue.playerRemoved', {
      playerId: queueItem.PlayerId,
      simulatorId,
      position,
      queueId
    });
  }

  /**
   * Retrieves all queues with player and simulator details
   */
  async getAllQueues() {
    return prisma.queue.findMany({
      include: { Player: true, Simulator: true },
    });
  }

  /**
   * Moves a player to a new position in the queue
   */
  async movePlayer(
    queueId: number,
    newPosition: number
  ): Promise<Queue & { Player: Player; Simulator: Simulator }> {
    // Find queue item to move
    const queueItem = await prismaClient.queue.findUnique({
      where: { id: queueId },
    });
    if (!queueItem) throw new Error("Queue item not found");

    const simulatorId = queueItem.SimulatorId;
    const oldPosition = queueItem.position;

    // No change needed if same position
    if (newPosition === oldPosition) {
      const updated = await prismaClient.queue.findUnique({
        where: { id: queueId },
        include: { Player: true, Simulator: true },
      });
      if (!updated) throw new Error("Queue item not found after move");
      return updated;
    }

    // Moving up in queue (lower position number)
    if (newPosition < oldPosition) {
      await prismaClient.$transaction([
        // Shift players down between new and old position
        prismaClient.queue.updateMany({
          where: {
            SimulatorId: simulatorId,
            position: { gte: newPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        }),
        // Move player to new position
        prismaClient.queue.update({
          where: { id: queueId },
          data: { position: newPosition },
        }),
      ]);
    } else {
      // Moving down in queue (higher position number)
      await prismaClient.$transaction([
        // Shift players up between old and new position
        prismaClient.queue.updateMany({
          where: {
            SimulatorId: simulatorId,
            position: { lte: newPosition, gt: oldPosition },
          },
          data: { position: { decrement: 1 } },
        }),
        // Move player to new position
        prismaClient.queue.update({
          where: { id: queueId },
          data: { position: newPosition },
        }),
      ]);
    }

    // Return updated queue item with relations
    const updated = await prismaClient.queue.findUnique({
      where: { id: queueId },
      include: { Player: true, Simulator: true },
    });
    if (!updated) throw new Error("Queue item not found after move");
    return updated;
  }
}
