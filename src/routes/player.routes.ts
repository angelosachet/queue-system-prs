import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';

const router = Router();
const controller = new PlayerController();

router.post('/', (req, res) => controller.create(req, res));
router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export { router as playerRouter };
