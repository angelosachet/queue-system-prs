import { Router } from 'express';
import { SimulatorController } from '../controllers/simulator.controller';

const router = Router();
const controller = new SimulatorController();

router.post('/', (req, res) => controller.create(req, res));          // criar simulador
router.get('/', (req, res) => controller.list(req, res));             // listar todos
router.get('/:id', (req, res) => controller.get(req, res));           // pegar por id
router.put('/:id', (req, res) => controller.update(req, res));        // atualizar
router.delete('/:id', (req, res) => controller.delete(req, res));     // deletar
router.put('/:id/active', (req, res) => controller.setActive(req, res)); // ativar/desativar

export { router as simulatorRouter };
