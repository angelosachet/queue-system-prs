import { PrismaClient } from '@prisma/client';
import { QueueJob } from '../jobs/queueJob';
import { eventService } from './event.service';

// Use global Prisma instance if available, otherwise create new one
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};
// Get singleton instance of queue job scheduler
const queueJob = QueueJob.getInstance();

export class TimedQueueService {
  // Time constants for queue management
  private TURN_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  private CONFIRMATION_WINDOW = 3 * 60 * 1000; // 3 minutes in milliseconds

  /**
   * Starts the timed queue system for a simulator
   */
  async startTimedQueue(simulatorId: number) {
    try {
      // Check if there's already an active player
      const activeQueue = await this.getActiveQueue(simulatorId);
      if (!activeQueue) {
        // Start processing the next player in queue
        await this.processNextInQueue(simulatorId);
      }
      return { started: true };
    } catch (error) {
      console.error('Error starting timed queue:', error);
      throw new Error('Failed to start timed queue');
    }
  }

  /**
   * Processes the next waiting player in queue and activates their turn
   */
  async processNextInQueue(simulatorId: number) {
    try {
      const prisma = getPrismaClient();
      // Move current active/confirmed player to end of queue
      const currentActive = await prisma.queue.findFirst({
        where: {
          SimulatorId: simulatorId,
          status: { in: ['ACTIVE', 'CONFIRMED'] }
        }
      });

      if (currentActive) {
        const lastPosition = await prisma.queue.findFirst({
          where: { SimulatorId: simulatorId },
          orderBy: { position: 'desc' }
        });
        
        await prisma.queue.update({
          where: { id: currentActive.id },
          data: {
            status: 'WAITING',
            position: (lastPosition?.position || 0) + 1,
            turnStartAt: null,
            expiresAt: null,
            confirmedAt: null
          }
        });
      }

      // Find next waiting player by position
      const nextPlayer = await prisma.queue.findFirst({
        where: {
          SimulatorId: simulatorId,
          status: 'WAITING'
        },
        orderBy: {
          position: 'asc'
        },
        include: {
          User: true
        }
      });

      if (!nextPlayer) {
        return null;
      }

      // Set turn timing
      const now = new Date();
      const turnStartAt = now;
      const expiresAt = new Date(now.getTime() + this.CONFIRMATION_WINDOW);

      // Activate player's turn
      await prisma.queue.update({
        where: { id: nextPlayer.id },
        data: {
          status: 'ACTIVE',
          turnStartAt,
          expiresAt,
          updatedAt: now
        }
      });

      // Schedule timeout for missed confirmation
      await queueJob.scheduleTurnTimeout(nextPlayer.id, expiresAt);

      // Emit event for player activation
      eventService.emit('timedQueue.playerActivated', {
        simulatorId,
        playerId: nextPlayer.UserId,
        queueId: nextPlayer.id,
        turnStartAt,
        expiresAt
      });

      return {
        player: nextPlayer.User,
        turnStartAt,
        expiresAt,
        estimatedWaitTime: await this.calculateWaitTime(simulatorId, nextPlayer.position)
      };
    } catch (error) {
      console.error('Error processing next in queue:', error);
      throw error;
    }
  }

  /**
   * Confirms a player's turn and schedules completion
   */
  async confirmPlayerTurn(queueId: number) {
    try {
      const prisma = getPrismaClient();
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { User: true }
      });

      if (!queueEntry || queueEntry.status !== 'ACTIVE') {
        throw new Error('Invalid queue entry or not in active state');
      }

      // Cancel the missed turn timeout
      await queueJob.cancelJob(queueId);

      // Mark turn as confirmed and start actual turn timer using player's custom time
      const now = new Date();
      const playerTurnDuration = queueEntry.timeMinutes * 60 * 1000; // Convert minutes to milliseconds
      const completionTime = new Date(now.getTime() + playerTurnDuration);
      
      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          expiresAt: completionTime,
          updatedAt: now
        }
      });

      // Schedule completion and next player processing
      await queueJob.scheduleCompletion(queueId, completionTime);

      // Emit event for player confirmation
      eventService.emit('timedQueue.playerConfirmed', {
        simulatorId: queueEntry.SimulatorId,
        playerId: queueEntry.UserId,
        queueId,
        confirmedAt: now,
        completionTime
      });

      return { confirmed: true, player: queueEntry.User };
    } catch (error) {
      console.error('Error confirming player turn:', error);
      throw error;
    }
  }

  /**
   * Handles when a player misses their confirmation window
   */
  async handleMissedConfirmation(queueId: number) {
    try {
      const prisma = getPrismaClient();
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { User: true }
      });

      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }

      // Reset player to waiting status and increment missed turns counter
      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'WAITING',
          missedTurns: queueEntry.missedTurns + 1,
          turnStartAt: null,
          expiresAt: null,
          updatedAt: new Date()
        }
      });

      return { handled: true, player: queueEntry.User };
    } catch (error) {
      console.error('Error handling missed confirmation:', error);
      throw error;
    }
  }

  /**
   * Gets the currently active player in a simulator's queue
   */
  async getActiveQueue(simulatorId: number) {
    try {
      const prisma = getPrismaClient();
      return await prisma.queue.findFirst({
        where: {
          SimulatorId: simulatorId,
          status: {
            in: ['ACTIVE', 'CONFIRMED']
          }
        },
        include: {
          User: true
        }
      });
    } catch (error) {
      console.error('Error getting active queue:', error);
      throw error;
    }
  }

  /**
   * Calculates estimated wait time for a player based on their position
   */
  async calculateWaitTime(simulatorId: number, currentPosition: number) {
    try {
      const prisma = getPrismaClient();
      // Count active/confirmed players
      const activePlayers = await prisma.queue.count({
        where: {
          SimulatorId: simulatorId,
          status: {
            in: ['ACTIVE', 'CONFIRMED']
          }
        }
      });

      // Count waiting players ahead in queue
      const waitingPlayers = await prisma.queue.count({
        where: {
          SimulatorId: simulatorId,
          status: 'WAITING',
          position: {
            lt: currentPosition
          }
        }
      });

      // Calculate total wait time based on players ahead and their custom times
      const playersAhead = await prisma.queue.findMany({
        where: {
          SimulatorId: simulatorId,
          OR: [
            { status: { in: ['ACTIVE', 'CONFIRMED'] } },
            { status: 'WAITING', position: { lt: currentPosition } }
          ]
        },
        select: { timeMinutes: true }
      });
      
      const totalWaitTime = playersAhead.reduce((total: number, player: { timeMinutes: number }) => {
        return total + (player.timeMinutes * 60 * 1000); // Convert to milliseconds
      }, 0);
      
      return totalWaitTime;
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return 0;
    }
  }

  /**
   * Gets complete queue status with wait times for all players
   */
  async getQueueStatus(simulatorId: number) {
    try {
      const prisma = getPrismaClient();
      const queue = await prisma.queue.findMany({
        where: { SimulatorId: simulatorId },
        orderBy: { position: 'asc' },
        include: {
          User: true
        }
      });

      const results = [];
      const now = new Date();
      
      for (const entry of queue) {
        const estimatedWaitTime = entry.status === 'WAITING' 
          ? await this.calculateWaitTime(simulatorId, entry.position)
          : null;

        // Calculate time left based on status
        let timeLeft = null;
        if (entry.status === 'ACTIVE' && entry.expiresAt) {
          timeLeft = Math.max(0, entry.expiresAt.getTime() - now.getTime());
        } else if (entry.status === 'CONFIRMED' && entry.confirmedAt) {
          const playerTurnDuration = entry.timeMinutes * 60 * 1000;
          const completionTime = new Date(entry.confirmedAt.getTime() + playerTurnDuration);
          timeLeft = Math.max(0, completionTime.getTime() - now.getTime());
        }

        results.push({
          id: entry.id,
          player: entry.User,
          position: entry.position,
          status: entry.status,
          turnStartAt: entry.turnStartAt,
          expiresAt: entry.expiresAt,
          confirmedAt: entry.confirmedAt,
          missedTurns: entry.missedTurns,
          estimatedWaitTime,
          timeLeft,
          timeMinutes: entry.timeMinutes,
          amountPaid: entry.amountPaid
        });
      }

      return results;
    } catch (error) {
      console.error('Error getting queue status:', error);
      throw error;
    }
  }
}