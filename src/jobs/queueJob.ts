import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';

const prisma = new PrismaClient();

export class QueueJob {
  private static instance: QueueJob;
  private jobs: Map<number, CronJob> = new Map();
  private TURN_DURATION = 5 * 60 * 1000; // 5 minutes
  private CONFIRMATION_WINDOW = 3 * 60 * 1000; // 3 minutes

  public static getInstance(): QueueJob {
    if (!QueueJob.instance) {
      QueueJob.instance = new QueueJob();
    }
    return QueueJob.instance;
  }

  async scheduleTurnTimeout(queueId: number, expiresAt: Date) {
    const job = new CronJob(
      expiresAt,
      async () => {
        await this.handleMissedTurn(queueId);
      },
      null,
      false,
      'UTC'
    );
    
    this.jobs.set(queueId, job);
    job.start();
  }

  async cancelJob(queueId: number) {
    const job = this.jobs.get(queueId);
    if (job) {
      job.stop();
      this.jobs.delete(queueId);
    }
  }

  private async handleMissedTurn(queueId: number) {
    try {
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId }
      });

      if (!queueEntry || queueEntry.status !== 'ACTIVE') {
        return;
      }

      // Update status and move to end of queue
      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'MISSED',
          missedTurns: { increment: 1 },
          updatedAt: new Date()
        }
      });

      // Re-queue player
      await this.requeuePlayer(queueId);

      // Process next player
      await this.processNextInQueue(queueEntry.SimulatorId);
    } catch (error) {
      console.error('Error handling missed turn:', error);
    }
  }

  private async requeuePlayer(queueId: number) {
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
  }

  private async processNextInQueue(simulatorId: number) {
    const nextPlayer = await prisma.queue.findFirst({
      where: {
        SimulatorId: simulatorId,
        status: 'WAITING'
      },
      orderBy: { position: 'asc' },
      include: { Player: true }
    });

    if (!nextPlayer) return;

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

    // Schedule timeout for this turn
    await this.scheduleTurnTimeout(nextPlayer.id, expiresAt);
  }

  async completeTurn(queueId: number) {
    try {
      await prisma.queue.delete({
        where: { id: queueId }
      });

      // Process next player
      const queueEntry = await prisma.queue.findUnique({
        where: { id: queueId },
        select: { SimulatorId: true }
      });

      if (queueEntry) {
        await this.processNextInQueue(queueEntry.SimulatorId);
      }
    } catch (error) {
      console.error('Error completing turn:', error);
    }
  }
}