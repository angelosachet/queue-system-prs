import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';

const router = Router();
const controller = new PlayerController();

router.post('/', (req, res) => controller.create(req, res)); //create
router.get('/', (req, res) => controller.getAll(req, res)); // get all
router.get('/:id', (req, res) => controller.getById(req, res)); // get by id
router.put('/:id', (req, res) => controller.update(req, res)); // update
router.delete('/:id', (req, res) => controller.delete(req, res)); // delete

export { router as playerRouter };
