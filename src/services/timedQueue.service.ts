import { PrismaClient } from '@prisma/client';
import { QueueJob } from '../jobs/queueJob';

// Use global Prisma instance if available, otherwise create new one
const prisma = (global as any).prisma ?? new PrismaClient();
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
          Player: true
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

  /**
   * Confirms a player's turn and schedules completion
   */
  async confirmPlayerTurn(queueId: number) {
    try {
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { Player: true }
      });

      if (!queueEntry || queueEntry.status !== 'ACTIVE') {
        throw new Error('Invalid queue entry or not in active state');
      }

      // Cancel the missed turn timeout
      await queueJob.cancelJob(queueId);

      // Mark turn as confirmed
      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Schedule completion after turn duration
      const completionTime = new Date(Date.now() + this.TURN_DURATION);
      await queueJob.scheduleCompletion(queueId, completionTime);

      return { confirmed: true, player: queueEntry.Player };
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
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { Player: true }
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

      return { handled: true, player: queueEntry.Player };
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

  /**
   * Calculates estimated wait time for a player based on their position
   */
  async calculateWaitTime(simulatorId: number, currentPosition: number) {
    try {
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

      // Calculate total wait time based on players ahead
      const totalAhead = activePlayers + waitingPlayers;
      return totalAhead * this.TURN_DURATION;
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return 0;
    }
  }


}