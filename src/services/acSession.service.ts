import { PrismaClient, ACSession, ACSessionStatus } from '@prisma/client';

// Use global Prisma instance if available, otherwise create new one
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};

export interface ACSessionData {
  pcIp: string;
  carModel?: string;
  trackName?: string;
  sessionConfig?: any;
}

export class ACSessionService {
  /**
   * Creates a new AC session record
   */
  async createACSession({
    queueId,
    playerId,
    simulatorId,
    pcIp,
    sessionStatus = 'PENDING'
  }: {
    queueId: number;
    playerId: number;
    simulatorId: number;
    pcIp: string;
    sessionStatus?: ACSessionStatus;
  }): Promise<ACSession> {
    const prisma = getPrismaClient();
    return prisma.aCSession.create({
      data: {
        queueId,
        playerId,
        simulatorId,
        pcIp,
        sessionStatus,
        startedAt: new Date()
      },
      include: {
        queue: true,
        player: true,
        simulator: true
      }
    });
  }

  /**
   * Updates an AC session status
   */
  async updateSessionStatus(
    sessionId: number,
    status: ACSessionStatus,
    completedAt?: Date
  ): Promise<ACSession> {
    const prisma = getPrismaClient();
    const updateData: any = {
      sessionStatus: status,
      updatedAt: new Date()
    };
    
    if (completedAt) {
      updateData.completedAt = completedAt;
    }

    return prisma.aCSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        queue: true,
        player: true,
        simulator: true
      }
    });
  }

  /**
   * Gets active AC sessions for a specific PC IP
   */
  async getActiveSessionsByPcIp(pcIp: string): Promise<ACSession[]> {
    const prisma = getPrismaClient();
    return prisma.aCSession.findMany({
      where: {
        pcIp,
        sessionStatus: { in: ['PENDING', 'ACTIVE'] }
      },
      include: {
        queue: true,
        player: true,
        simulator: true
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
  }

  /**
   * Gets AC session by queue ID
   */
  async getSessionByQueueId(queueId: number): Promise<ACSession | null> {
    const prisma = getPrismaClient();
    return prisma.aCSession.findFirst({
      where: {
        queueId,
        sessionStatus: { in: ['PENDING', 'ACTIVE'] }
      },
      include: {
        queue: true,
        player: true,
        simulator: true
      }
    });
  }

  /**
   * Gets all active AC sessions
   */
  async getActiveSessions(): Promise<ACSession[]> {
    const prisma = getPrismaClient();
    return prisma.aCSession.findMany({
      where: {
        sessionStatus: { in: ['PENDING', 'ACTIVE'] }
      },
      include: {
        queue: true,
        player: true,
        simulator: true
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
  }

  /**
   * Ends an AC session
   */
  async endSession(sessionId: number): Promise<ACSession> {
    return this.updateSessionStatus(sessionId, 'COMPLETED', new Date());
  }

  /**
   * Marks an AC session as failed
   */
  async failSession(sessionId: number): Promise<ACSession> {
    return this.updateSessionStatus(sessionId, 'FAILED', new Date());
  }

  /**
   * Cleans up old completed/failed sessions (older than 24 hours)
   */
  async cleanupOldSessions(): Promise<number> {
    const prisma = getPrismaClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await prisma.aCSession.deleteMany({
      where: {
        sessionStatus: { in: ['COMPLETED', 'FAILED'] },
        completedAt: {
          lt: oneDayAgo
        }
      }
    });
    
    return result.count;
  }
}