import { Router } from 'express';
import { TimePatternController } from '../controllers/timePattern.controller';
import { authenticate, adminOrMaster } from '../middleware/auth.middleware';

const router = Router();
const controller = new TimePatternController();

// Rotas para admin
router.post('/', authenticate, adminOrMaster, (req, res) => controller.create(req, res));
router.put('/:id', authenticate, adminOrMaster, (req, res) => controller.update(req, res));
router.delete('/:id', authenticate, adminOrMaster, (req, res) => controller.delete(req, res));

// Rotas públicas para vendedores
router.get('/', (req, res) => controller.list(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));

export { router as timePatternRouter };