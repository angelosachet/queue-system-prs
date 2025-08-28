import { Router } from 'express';
import { QueueController } from '../controllers/queue.controller';

const router = Router();
const controller = new QueueController();

router.post('/', (req, res) => controller.addPlayer(req, res));             // add player
router.get('/:simulatorId', (req, res) => controller.listQueue(req, res)); // list fila
router.delete('/:queueId', (req, res) => controller.removePlayer(req, res)); // remove player
router.put('/:queueId/move', (req, res) => controller.movePlayer(req, res)); // move posição

export { router as queueRouter };
