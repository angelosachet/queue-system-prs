import { EventEmitter } from 'events';
import { ACSessionService } from './acSession.service';
import { acWebSocketClientService } from './acWebSocketClient.service';
import { eventService } from './event.service';
import { PrismaClient } from '@prisma/client';

// Use global Prisma instance if available, otherwise create new one
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};

export interface SessionConfig {
  carModel?: string;
  trackName?: string;
  sessionType?: string;
  timeLimit?: number;
  lapLimit?: number;
}

export class SessionManagementService extends EventEmitter {
  private acSessionService = new ACSessionService();
  private sessionTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private defaultSessionTimeout = 10 * 60 * 1000; // 10 minutes

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for queue and AC Launcher events
   */
  private setupEventListeners(): void {
    // Listen for player confirmations from timed queue
    eventService.on('timedQueue.playerConfirmed', this.handlePlayerConfirmed.bind(this));
    
    // Listen for AC Launcher connections
    acWebSocketClientService.on('connected', this.handleACLauncherConnected.bind(this));
    acWebSocketClientService.on('disconnected', this.handleACLauncherDisconnected.bind(this));
    
    // Listen for AC Launcher messages
    acWebSocketClientService.on('message:playerjoined', this.handlePlayerJoined.bind(this));
    acWebSocketClientService.on('message:playerleft', this.handlePlayerLeft.bind(this));
    acWebSocketClientService.on('message:sessionended', this.handleSessionEnded.bind(this));
  }

  /**
   * Handle player confirmation from timed queue
   */
  private async handlePlayerConfirmed(event: any): Promise<void> {
    const { simulatorId, playerId, queueId, acSession } = event;
    
    try {
      // Get simulator info to find PC IP
      const prisma = getPrismaClient();
      const simulator = await prisma.simulator.findUnique({
        where: { id: simulatorId }
      });

      if (!simulator?.pcIp) {
        console.log(`No PC IP configured for simulator ${simulatorId}, skipping AC session`);
        return;
      }

      // Get player information for real name
      const player = await prisma.user.findUnique({
        where: { id: playerId }
      });

      if (!player) {
        console.error(`Player with ID ${playerId} not found`);
        return;
      }

      // Ensure connection to AC Launcher
      await this.ensureACConnection(simulator.pcIp);

      // Create or update AC session if not already created
      let sessionRecord = acSession;
      if (!sessionRecord) {
        sessionRecord = await this.acSessionService.createACSession({
          queueId,
          playerId,
          simulatorId,
          pcIp: simulator.pcIp,
          sessionStatus: 'ACTIVE'
        });
      }

      // Send session configuration to AC Launcher with real player name
      await this.configureACSession(simulator.pcIp, sessionRecord.id, {
        carModel: 'default',
        trackName: 'default',
        sessionType: 'practice',
        timeLimit: 10 // minutes
      }, player.name);

      // Set session timeout
      this.setSessionTimeout(sessionRecord.id, this.defaultSessionTimeout);

      this.emit('sessionStarted', {
        sessionId: sessionRecord.id,
        queueId,
        playerId,
        simulatorId,
        pcIp: simulator.pcIp
      });

    } catch (error) {
      console.error('Error handling player confirmation:', error);
      this.emit('sessionError', { queueId, playerId, error });
    }
  }

  /**
   * Ensure connection to AC Launcher
   */
  private async ensureACConnection(pcIp: string): Promise<void> {
    const status = acWebSocketClientService.getConnectionStatus(pcIp);
    if (!status || !status.isConnected) {
      console.log(`Connecting to AC Launcher at ${pcIp}`);
      await acWebSocketClientService.connect(pcIp);
    }
  }

  /**
   * Configure AC session with specific settings
   */
  private async configureACSession(pcIp: string, sessionId: number, config: SessionConfig, playerName?: string): Promise<void> {
    try {
      // Configure and start AC session using proper AC Launcher commands
      await acWebSocketClientService.configureAndStartSession(pcIp, {
        sessionId,
        playerName: playerName || `Player_${sessionId}`,
        carModel: config.carModel,
        trackName: config.trackName,
        sessionType: config.sessionType || 'practice',
        timeLimit: config.timeLimit || 10
      });

      console.log(`Configured AC session ${sessionId} on ${pcIp} for player ${playerName || `Player_${sessionId}`}:`, config);
    } catch (error) {
      console.error(`Failed to configure AC session ${sessionId} on ${pcIp}:`, error);
      throw error;
    }
  }

  /**
   * Set session timeout
   */
  private setSessionTimeout(sessionId: number, timeoutMs: number): void {
    // Clear existing timeout if any
    this.clearSessionTimeout(sessionId);

    const timeout = setTimeout(async () => {
      await this.handleSessionTimeout(sessionId);
    }, timeoutMs);

    this.sessionTimeouts.set(sessionId, timeout);
    console.log(`Set timeout for session ${sessionId}: ${timeoutMs}ms`);
  }

  /**
   * Clear session timeout
   */
  private clearSessionTimeout(sessionId: number): void {
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(sessionId: number): Promise<void> {
    try {
      console.log(`Session ${sessionId} timed out`);
      
      // Update session status to failed
      await this.acSessionService.failSession(sessionId);
      
      // Get session details for cleanup
      const prisma = getPrismaClient();
      const session = await prisma.aCSession.findUnique({
        where: { id: sessionId },
        include: { simulator: true }
      });

      if (session?.simulator?.pcIp) {
        // Send end session command to AC Launcher
        await acWebSocketClientService.sendCommand(session.simulator.pcIp, {
          command: 'endsession',
          data: { sessionId }
        });
      }

      this.emit('sessionTimeout', { sessionId });
    } catch (error) {
      console.error(`Error handling session timeout for ${sessionId}:`, error);
    }
  }

  /**
   * Handle AC Launcher connection
   */
  private handleACLauncherConnected(event: { pcIp: string }): void {
    console.log(`AC Launcher connected: ${event.pcIp}`);
    this.emit('acLauncherConnected', event);
  }

  /**
   * Handle AC Launcher disconnection
   */
  private handleACLauncherDisconnected(event: { pcIp: string }): void {
    console.log(`AC Launcher disconnected: ${event.pcIp}`);
    this.emit('acLauncherDisconnected', event);
    
    // Mark all active sessions for this PC as failed
    this.failSessionsForPC(event.pcIp);
  }

  /**
   * Handle player joined AC session
   */
  private async handlePlayerJoined(event: { pcIp: string; response: any }): Promise<void> {
    console.log(`Player joined AC session on ${event.pcIp}:`, event.response);
    // Update session status or perform other actions as needed
  }

  /**
   * Handle player left AC session
   */
  private async handlePlayerLeft(event: { pcIp: string; response: any }): Promise<void> {
    console.log(`Player left AC session on ${event.pcIp}:`, event.response);
    // Update session status or perform cleanup as needed
  }

  /**
   * Handle session ended from AC Launcher
   */
  private async handleSessionEnded(event: { pcIp: string; response: any }): Promise<void> {
    console.log(`Session ended on ${event.pcIp}:`, event.response);
    
    try {
      // Find and complete the session
      const sessions = await this.acSessionService.getActiveSessionsByPcIp(event.pcIp);
      for (const session of sessions) {
        await this.acSessionService.endSession(session.id);
        this.clearSessionTimeout(session.id);
        
        this.emit('sessionCompleted', {
          sessionId: session.id,
          queueId: session.queueId,
          playerId: session.playerId
        });
      }
    } catch (error) {
      console.error('Error handling session ended:', error);
    }
  }

  /**
   * Fail all active sessions for a PC
   */
  private async failSessionsForPC(pcIp: string): Promise<void> {
    try {
      const sessions = await this.acSessionService.getActiveSessionsByPcIp(pcIp);
      for (const session of sessions) {
        await this.acSessionService.failSession(session.id);
        this.clearSessionTimeout(session.id);
        
        this.emit('sessionFailed', {
          sessionId: session.id,
          queueId: session.queueId,
          playerId: session.playerId,
          reason: 'AC Launcher disconnected'
        });
      }
    } catch (error) {
      console.error(`Error failing sessions for PC ${pcIp}:`, error);
    }
  }

  /**
   * Manually end a session
   */
  async endSession(sessionId: number): Promise<void> {
    try {
      const session = await this.acSessionService.endSession(sessionId);
      this.clearSessionTimeout(sessionId);
      
      // Send end command to AC Launcher if connected
      if (session.pcIp) {
        await acWebSocketClientService.sendCommand(session.pcIp, {
          command: 'endsession',
          data: { sessionId }
        });
      }

      this.emit('sessionEnded', {
        sessionId,
        queueId: session.queueId,
        playerId: session.playerId
      });
    } catch (error) {
      console.error(`Error ending session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: number): Promise<any> {
    const prisma = getPrismaClient();
    const session = await prisma.aCSession.findUnique({
      where: { id: sessionId },
      include: {
        queue: true,
        player: true,
        simulator: true
      }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const hasTimeout = this.sessionTimeouts.has(sessionId);
    const acStatus = session.simulator?.pcIp 
      ? acWebSocketClientService.getConnectionStatus(session.simulator.pcIp)
      : null;

    return {
      ...session,
      hasTimeout,
      acLauncherStatus: acStatus
    };
  }

  /**
   * Initialize connections to all configured simulators
   */
  async initializeConnections(): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const simulators = await prisma.simulator.findMany({
        where: {
          active: true,
          pcIp: { not: null }
        }
      });

      console.log(`Initializing connections to ${simulators.length} AC Launcher instances`);
      
      for (const simulator of simulators) {
        if (simulator.pcIp) {
          try {
            await acWebSocketClientService.connect(simulator.pcIp);
          } catch (error) {
            console.error(`Failed to connect to AC Launcher at ${simulator.pcIp}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing AC Launcher connections:', error);
    }
  }
}

// Export singleton instance
export const sessionManagementService = new SessionManagementService();