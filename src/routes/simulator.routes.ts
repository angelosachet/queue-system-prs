import { Router } from 'express';
import { SimulatorController } from '../controllers/simulator.controller';

const router = Router();
const controller = new SimulatorController();

router.post('/', (req, res) => controller.create(req, res));          // create simulator
router.get('/', (req, res) => controller.list(req, res));             // list all
router.get('/:id', (req, res) => controller.get(req, res));           // get by id
router.put('/:id', (req, res) => controller.update(req, res));        // update
router.delete('/:id', (req, res) => controller.delete(req, res));     // delete
router.put('/:id/active', (req, res) => controller.setActive(req, res)); // set active

export { router as simulatorRouter };
