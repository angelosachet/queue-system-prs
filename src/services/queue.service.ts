// service/queue.service.ts
import { Queue, User, Simulator } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { eventService } from "./event.service";
import { TimedQueueService } from "./timedQueue.service";

declare global {
  var prisma: PrismaClient;
}

// Use global Prisma instance if available, otherwise create new one
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if (global.prisma) return global.prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};
const prisma = getPrismaClient();

export class QueueService {
  /**
   * Adds a player to a simulator's queue at the end position
   */
  async addPlayerToQueue(
    playerId: number,
    simulatorId: number,
    timeMinutes: number = 5,
    amountPaid: number = 0,
    sellerId?: number
  ): Promise<Queue & { User: User; Simulator: Simulator }> {
    // Validate player and simulator exist in parallel
    const prismaClient = getPrismaClient();
    const [player, simulator] = await Promise.all([
      prismaClient.user.findUnique({ where: { id: playerId, role: 'PLAYER' } }),
      prismaClient.simulator.findUnique({ 
        where: { id: simulatorId },
        include: { Queue: true }
      })
    ]);
    
    if (!player) throw new Error("Player not found");
    if (!simulator) throw new Error("Simulator not found");

    // Check if player is already in this simulator's queue
    const existingEntry = await prismaClient.queue.findFirst({
      where: {
        UserId: playerId,
        SimulatorId: simulatorId
      }
    });
    
    if (existingEntry) {
      throw new Error("Player is already in this queue");
    }

    // Get current queue size to determine new position
    const count = await prismaClient.queue.count({
      where: { SimulatorId: simulatorId },
    });

    // Create queue entry at end of queue
    const queueItem = await prismaClient.queue.create({
      data: {
        UserId: playerId,
        SimulatorId: simulatorId,
        position: count + 1,
        timeMinutes,
        amountPaid,
      },
      include: { User: true, Simulator: true },
    });

    // Register sale if there's a seller and amount paid
    if (sellerId && amountPaid > 0) {
      await prismaClient.saleRecord.create({
        data: {
          sellerId,
          playerId,
          simulatorId,
          amountPaid,
        },
      });
    }

    // Auto-start timed queue if not already active
    await this.autoStartTimedQueue(simulatorId);

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
        UserId: PlayerId,
        SimulatorId,
        position: newPosition,
      },
    });
  }

  /**
   * Retrieves all players in a simulator's queue ordered by position
   */
  async getQueue(simulatorId: number): Promise<(Queue & { User: User })[]> {
    const prismaClient = getPrismaClient();
    return prismaClient.queue.findMany({
      where: { SimulatorId: simulatorId },
      include: { User: true },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });
  }

  /**
   * Removes a player from queue and reorganizes positions
   */
  async removePlayerFromQueue(queueId: number): Promise<void> {
    const prismaClient = getPrismaClient();
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
      playerId: queueItem.UserId,
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
      include: { User: true, Simulator: true },
    });
  }

  /**
   * Moves a player to a new position by swapping with target player (WAITING players only)
   */
  async movePlayer(
    queueId: number,
    newPosition: number
  ): Promise<Queue & { User: User; Simulator: Simulator }> {
    const prismaClient = getPrismaClient();
    
    // Find queue item to move
    const queueItem = await prismaClient.queue.findUnique({
      where: { id: queueId },
    });
    if (!queueItem) throw new Error("Queue item not found");
    
    // Only allow moving WAITING players
    if (queueItem.status !== 'WAITING') {
      throw new Error("Can only move players with WAITING status");
    }

    const simulatorId = queueItem.SimulatorId;
    const oldPosition = queueItem.position;

    // No change needed if same position
    if (newPosition === oldPosition) {
      const updated = await prismaClient.queue.findUnique({
        where: { id: queueId },
        include: { User: true, Simulator: true },
      });
      if (!updated) throw new Error("Queue item not found after move");
      return updated;
    }

    // Find target player at new position
    const targetPlayer = await prismaClient.queue.findFirst({
      where: {
        SimulatorId: simulatorId,
        position: newPosition,
        status: 'WAITING'
      }
    });

    if (!targetPlayer) {
      throw new Error("No WAITING player found at target position");
    }

    // Swap positions
    await prismaClient.$transaction([
      prismaClient.queue.update({
        where: { id: queueId },
        data: { position: newPosition },
      }),
      prismaClient.queue.update({
        where: { id: targetPlayer.id },
        data: { position: oldPosition },
      }),
    ]);

    // Normalize positions after swap
    await this.normalizeWaitingPositions(simulatorId);

    // Return updated queue item
    const updated = await prismaClient.queue.findUnique({
      where: { id: queueId },
      include: { User: true, Simulator: true },
    });
    if (!updated) throw new Error("Queue item not found after move");
    
    // Emit event for queue movement
    eventService.emit('queue.playerMoved', {
      playerId: updated.UserId,
      simulatorId: updated.SimulatorId,
      oldPosition,
      newPosition: updated.position, // Use normalized position
      queueId: updated.id
    });
    
    return updated;
  }

  /**
   * Normalizes positions for WAITING players to be consecutive starting from 1
   */
  async normalizeWaitingPositions(simulatorId: number): Promise<void> {
    const prismaClient = getPrismaClient();
    
    // Get all WAITING players ordered by current position
    const waitingPlayers = await prismaClient.queue.findMany({
      where: {
        SimulatorId: simulatorId,
        status: 'WAITING'
      },
      orderBy: { position: 'asc' }
    });

    // Update positions to be consecutive starting from 1
    for (let i = 0; i < waitingPlayers.length; i++) {
      await prismaClient.queue.update({
        where: { id: waitingPlayers[i].id },
        data: { position: i + 1 }
      });
    }
  }

  /**
   * Automatically starts timed queue if not already active and there are players waiting
   */
  private async autoStartTimedQueue(simulatorId: number): Promise<void> {
    try {
      const prismaClient = getPrismaClient();
      
      // Normalize positions first
      await this.normalizeWaitingPositions(simulatorId);
      
      // Check if there's already an active or confirmed player in this simulator's queue
      const activePlayer = await prismaClient.queue.findFirst({
        where: {
          SimulatorId: simulatorId,
          status: { in: ['ACTIVE', 'CONFIRMED'] }
        }
      });

      // If no active player, check if there are waiting players
      if (!activePlayer) {
        const waitingPlayers = await prismaClient.queue.count({
          where: {
            SimulatorId: simulatorId,
            status: 'WAITING'
          }
        });

        // If there are waiting players, start the timed queue
        if (waitingPlayers > 0) {
          const timedQueueService = new TimedQueueService();
          await timedQueueService.processNextInQueue(simulatorId);
        }
      }
    } catch (error) {
      // Log error but don't throw - queue addition should still succeed
      console.error('Error auto-starting timed queue:', error);
    }
  }
}
