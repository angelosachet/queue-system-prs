import { Router } from 'express';
import { TimedQueueController } from '../controllers/timedQueue.controller';

const router = Router();
const controller = new TimedQueueController();

router.post('/simulator/:simulatorId/start', (req, res) => controller.startTimedQueue(req, res));
router.post('/:simulatorId/start', (req, res) => controller.startTimedQueue(req, res));
router.get('/simulator/:simulatorId/status', (req, res) => controller.getQueueStatus(req, res));
router.get('/:simulatorId/status', (req, res) => controller.getQueueStatus(req, res));
router.post('/simulator/:simulatorId/next', (req, res) => controller.processNext(req, res));
router.post('/:simulatorId/next', (req, res) => controller.processNext(req, res));
router.post('/:queueId/confirm', (req, res) => controller.confirmTurn(req, res));
router.post('/:queueId/missed', (req, res) => controller.handleMissed(req, res));

export { router as timedQueueRouter };