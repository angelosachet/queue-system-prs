import { Request, Response } from 'express';
import { ACSessionService } from '../services/acSession.service';
import { acWebSocketClientService } from '../services/acWebSocketClient.service';
import { configurationService } from '../services/configuration.service';

const acSessionService = new ACSessionService();

export class ACLauncherController {
  /**
   * GET /ac-launcher/status/:pcIp - Check AC Launcher connection status
   */
  async getStatus(req: Request, res: Response) {
    try {
      const { pcIp } = req.params;
      
      if (!pcIp) {
        return res.status(400).json({ 
          success: false, 
          error: 'PC IP is required' 
        });
      }

      // Validate PC IP format
      if (!configurationService.validatePcIp(pcIp)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid PC IP format' 
        });
      }

      const activeSessions = await acSessionService.getActiveSessionsByPcIp(pcIp);
      const status = acWebSocketClientService.getConnectionStatus(pcIp);
      const reconnectionStatus = acWebSocketClientService.getReconnectionStatus(pcIp);
      const connectivity = await configurationService.testPcConnectivity(pcIp);
      
      return res.json({
        success: true,
        data: {
          pcIp,
          isConnected: activeSessions.length > 0,
          activeSessions: activeSessions.length,
          sessions: activeSessions,
          status: status || { isConnected: false, lastSeen: null, error: 'Not connected' },
          reconnection: reconnectionStatus,
          connectivity: {
            reachable: connectivity,
            testedAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /ac-launcher/session - Create/update AC session
   */
  async createSession(req: Request, res: Response) {
    try {
      const { queueId, playerId, simulatorId, pcIp, sessionStatus, sessionConfig, carId, trackId } = req.body;
      
      if (!queueId || !playerId || !simulatorId || !pcIp) {
        return res.status(400).json({
          success: false,
          error: 'queueId, playerId, simulatorId, and pcIp are required'
        });
      }

      // Validate PC IP format
      if (!configurationService.validatePcIp(pcIp)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid PC IP format'
        });
      }

      // Get and validate session configuration
      const config = await configurationService.getSessionConfiguration({
        carId,
        trackId,
        ...sessionConfig
      });

      if (sessionConfig) {
        const validation = configurationService.validateSessionConfiguration(sessionConfig);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid session configuration',
            details: validation.errors
          });
        }
      }

      // Get player information for real name
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const player = await prisma.user.findUnique({
        where: { id: playerId }
      });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }

      const session = await acSessionService.createACSession({
        queueId,
        playerId,
        simulatorId,
        pcIp,
        sessionStatus: sessionStatus || 'PENDING'
      });

      // Configure and start AC session using proper AC Launcher commands with real player name
      await acWebSocketClientService.configureAndStartSession(pcIp, {
        sessionId: session.id,
        playerName: player.name,
        carModel: config.car?.model || carId,
        trackName: config.track?.name || trackId,
        sessionType: config.session?.sessionType || 'practice',
        timeLimit: config.session?.timeLimit || 10
      });

      await prisma.$disconnect();

      return res.status(201).json({
        success: true,
        message: 'AC session created successfully',
        data: {
          ...session,
          configuration: config
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /ac-launcher/session/:sessionId - Update AC session status
   */
  async updateSession(req: Request, res: Response) {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { sessionStatus, completedAt } = req.body;
      
      if (!sessionStatus) {
        return res.status(400).json({
          success: false,
          error: 'sessionStatus is required'
        });
      }

      const session = await acSessionService.updateSessionStatus(
        sessionId,
        sessionStatus,
        completedAt ? new Date(completedAt) : undefined
      );

      return res.json({
        success: true,
        message: 'AC session updated successfully',
        data: session
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /ac-launcher/session/:sessionId - End AC session
   */
  async endSession(req: Request, res: Response) {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      const session = await acSessionService.endSession(sessionId);

      return res.json({
        success: true,
        message: 'AC session ended successfully',
        data: session
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /ac-launcher/sessions - List active sessions
   */
  async listActiveSessions(req: Request, res: Response) {
    try {
      const { pcIp } = req.query;
      
      let sessions;
      if (pcIp) {
        sessions = await acSessionService.getActiveSessionsByPcIp(pcIp as string);
      } else {
        sessions = await acSessionService.getActiveSessions();
      }

      return res.json({
        success: true,
        data: {
          count: sessions.length,
          sessions
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /ac-launcher/sessions/cleanup - Clean up old sessions
   */
  async cleanupSessions(req: Request, res: Response) {
    try {
      const deletedCount = await acSessionService.cleanupOldSessions();

      return res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old sessions`,
        data: { deletedCount }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /ac-launcher/session/queue/:queueId - Get session by queue ID
   */
  async getSessionByQueueId(req: Request, res: Response) {
    try {
      const queueId = parseInt(req.params.queueId);
      
      const session = await acSessionService.getSessionByQueueId(queueId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'No active session found for this queue'
        });
      }

      return res.json({
        success: true,
        data: session
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /ac-launcher/cars - Get available cars
   */
  async getAvailableCars(req: Request, res: Response) {
    try {
      const cars = configurationService.getAvailableCars();
      return res.json({
        success: true,
        data: cars
      });
    } catch (error) {
      console.error('Error getting available cars:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get cars'
      });
    }
  }

  /**
   * GET /ac-launcher/tracks - Get available tracks
   */
  async getAvailableTracks(req: Request, res: Response) {
    try {
      const tracks = configurationService.getAvailableTracks();
      return res.json({
        success: true,
        data: tracks
      });
    } catch (error) {
      console.error('Error getting available tracks:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get tracks'
      });
    }
  }

  /**
   * GET /ac-launcher/config/summary - Get system configuration summary
   */
  async getConfigSummary(req: Request, res: Response) {
    try {
      const summary = await configurationService.getSystemConfigSummary();
      return res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting config summary:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get configuration summary'
      });
    }
  }

  /**
   * POST /ac-launcher/validate/simulator/:simulatorId - Validate simulator configuration
   */
  async validateSimulator(req: Request, res: Response) {
    try {
      const { simulatorId } = req.params;
      
      if (!simulatorId) {
        return res.status(400).json({
          success: false,
          error: 'Simulator ID is required'
        });
      }

      const validation = await configurationService.validateSimulatorConfig(parseInt(simulatorId));
      
      return res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating simulator:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate simulator'
      });
    }
  }

  /**
   * POST /ac-launcher/reconnect - Force reconnection to AC Launcher
   */
  async reconnect(req: Request, res: Response) {
    try {
      const { pcIp } = req.body;
      
      if (!pcIp) {
        return res.status(400).json({
          success: false,
          error: 'pcIp is required'
        });
      }

      const result = await acWebSocketClientService.forceReconnect(pcIp);
      
      res.json({
        success: true,
        message: result ? 'Reconnection successful' : 'Reconnection failed',
        data: { pcIp, connected: result }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /ac-launcher/connection-stats - Get connection statistics
   */
  async getConnectionStats(req: Request, res: Response) {
    try {
      const stats = acWebSocketClientService.getConnectionStats();
      const activeConnections = acWebSocketClientService.getActiveConnections();
      
      res.json({
        success: true,
        data: {
          ...stats,
          activeConnections
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}