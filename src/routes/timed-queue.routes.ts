import { Router } from 'express';
import { TimedQueueController } from '../controllers/timedQueue.controller';

const router = Router();
const controller = new TimedQueueController();

router.post('/simulator/:simulatorId/start', (req, res) => controller.startTimedQueue(req, res)); //starts queue
router.post('/:simulatorId/start', (req, res) => controller.startTimedQueue(req, res)); //starts queue
router.get('/simulator/:simulatorId/status', (req, res) => controller.getQueueStatus(req, res)); //get queue status
router.get('/:simulatorId/status', (req, res) => controller.getQueueStatus(req, res)); //get queue status
router.post('/simulator/:simulatorId/next', (req, res) => controller.processNext(req, res)); //process next
router.post('/:simulatorId/next', (req, res) => controller.processNext(req, res)); //process next
router.post('/:queueId/confirm', (req, res) => controller.confirmTurn(req, res)); //confirm turn
router.post('/:queueId/missed', (req, res) => controller.handleMissed(req, res)); //handle missed

export { router as timedQueueRouter };