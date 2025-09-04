import { Router } from 'express';
import { ACLauncherController } from '../controllers/acLauncher.controller';

const router = Router();
const controller = new ACLauncherController();

// AC Launcher status endpoints
router.get('/status/:pcIp', (req, res) => controller.getStatus(req, res));
router.post('/reconnect', (req, res) => controller.reconnect(req, res));
router.get('/connection-stats', (req, res) => controller.getConnectionStats(req, res));

// AC session management endpoints
router.post('/session', (req, res) => controller.createSession(req, res));
router.put('/session/:sessionId', (req, res) => controller.updateSession(req, res));
router.delete('/session/:sessionId', (req, res) => controller.endSession(req, res));
router.get('/session/queue/:queueId', (req, res) => controller.getSessionByQueueId(req, res));

// Sessions listing and management
router.get('/sessions', (req, res) => controller.listActiveSessions(req, res));
router.post('/sessions/cleanup', (req, res) => controller.cleanupSessions(req, res));

// Configuration routes
router.get('/cars', (req, res) => controller.getAvailableCars(req, res));
router.get('/tracks', (req, res) => controller.getAvailableTracks(req, res));
router.get('/config/summary', (req, res) => controller.getConfigSummary(req, res));
router.post('/validate/simulator/:simulatorId', (req, res) => controller.validateSimulator(req, res));

export { router as acLauncherRouter };