import { PrismaClient } from '@prisma/client';
import { QueueJob } from '../jobs/queueJob';

const prismaClient = (global as any).prisma ?? new PrismaClient();
const prisma = prismaClient;
const queueJob = QueueJob.getInstance();

export class TimedQueueService {
  private TURN_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  private CONFIRMATION_WINDOW = 3 * 60 * 1000; // 3 minutes in milliseconds

  async startTimedQueue(simulatorId: number) {
    try {
      const activeQueue = await this.getActiveQueue(simulatorId);
      if (!activeQueue) {
        await this.processNextInQueue(simulatorId);
      }
      return { started: true };
    } catch (error) {
      console.error('Error starting timed queue:', error);
      throw new Error('Failed to start timed queue');
    }
  }

  async processNextInQueue(simulatorId: number) {
    try {
      const nextPlayer = await prisma.queue.findFirst({
        where: {
          SimulatorId: simulatorId,
          status: 'WAITING'
        },
        orderBy: {
          position: 'asc'
        },
        include: {
          Player: true
        }
      });

      if (!nextPlayer) {
        return null;
      }

      const now = new Date();
      const turnStartAt = now;
      const expiresAt = new Date(now.getTime() + this.CONFIRMATION_WINDOW);

      await prisma.queue.update({
        where: { id: nextPlayer.id },
        data: {
          status: 'ACTIVE',
          turnStartAt,
          expiresAt,
          updatedAt: now
        }
      });

      return {
        player: nextPlayer.Player,
        turnStartAt,
        expiresAt,
        estimatedWaitTime: await this.calculateWaitTime(simulatorId, nextPlayer.position)
      };
    } catch (error) {
      console.error('Error processing next in queue:', error);
      throw error;
    }
  }

  async confirmPlayerTurn(queueId: number) {
    try {
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { Player: true }
      });

      if (!queueEntry || queueEntry.status !== 'ACTIVE') {
        throw new Error('Invalid queue entry or not in active state');
      }

      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Schedule completion after turn duration
      setTimeout(async () => {
        await this.completeTurn(queueId);
      }, this.TURN_DURATION);

      return { confirmed: true, player: queueEntry.Player };
    } catch (error) {
      console.error('Error confirming player turn:', error);
      throw error;
    }
  }

  async handleMissedConfirmation(queueId: number) {
    try {
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { Player: true }
      });

      if (!queueEntry || queueEntry.status !== 'ACTIVE') {
        return;
      }

      // Mark as missed and move to end of queue
      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'MISSED',
          missedTurns: { increment: 1 },
          updatedAt: new Date()
        }
      });

      // Re-queue at the end
      await this.requeuePlayer(queueId);

      // Process next player
      await this.processNextInQueue(queueEntry.SimulatorId);
    } catch (error) {
      console.error('Error handling missed confirmation:', error);
      throw error;
    }
  }

  async requeuePlayer(queueId: number) {
    try {
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId }
      });

      if (!queueEntry) return;

      const maxPosition = await prisma.queue.aggregate({
        where: { SimulatorId: queueEntry.SimulatorId },
        _max: { position: true }
      });

      const newPosition = (maxPosition._max.position || 0) + 1;

      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'WAITING',
          position: newPosition,
          turnStartAt: null,
          confirmedAt: null,
          expiresAt: null,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error requeuing player:', error);
      throw error;
    }
  }

  async completeTurn(queueId: number) {
    try {
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId }
      });

      if (!queueEntry) return;

      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      // Remove from queue
      await prisma.queue.delete({
        where: { id: queueId }
      });

      // Process next player
      await this.processNextInQueue(queueEntry.SimulatorId);
    } catch (error) {
      console.error('Error completing turn:', error);
      throw error;
    }
  }

  async getActiveQueue(simulatorId: number) {
    try {
      return await prisma.queue.findFirst({
        where: {
          SimulatorId: simulatorId,
          status: {
            in: ['ACTIVE', 'CONFIRMED']
          }
        },
        include: {
          Player: true
        }
      });
    } catch (error) {
      console.error('Error getting active queue:', error);
      throw error;
    }
  }

  async calculateWaitTime(simulatorId: number, currentPosition: number) {
    try {
      const activePlayers = await prisma.queue.count({
        where: {
          SimulatorId: simulatorId,
          status: {
            in: ['ACTIVE', 'CONFIRMED']
          }
        }
      });

      const waitingPlayers = await prisma.queue.count({
        where: {
          SimulatorId: simulatorId,
          status: 'WAITING',
          position: {
            lt: currentPosition
          }
        }
      });

      const totalAhead = activePlayers + waitingPlayers;
      return totalAhead * this.TURN_DURATION;
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return 0;
    }
  }

  async getQueueStatus(simulatorId: number) {
    try {
      const queue = await prisma.queue.findMany({
        where: { SimulatorId: simulatorId },
        orderBy: { position: 'asc' },
        include: {
          Player: true
        }
      });

      const results = [];
      for (const entry of queue) {
        const estimatedWaitTime = entry.status === 'WAITING' 
          ? await this.calculateWaitTime(simulatorId, entry.position)
          : null;

        results.push({
          id: entry.id,
          player: entry.Player,
          position: entry.position,
          status: entry.status,
          turnStartAt: entry.turnStartAt,
          expiresAt: entry.expiresAt,
          confirmedAt: entry.confirmedAt,
          missedTurns: entry.missedTurns,
          estimatedWaitTime
        });
      }

      return results;
    } catch (error) {
      console.error('Error getting queue status:', error);
      throw error;
    }
  }
}