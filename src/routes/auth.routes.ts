import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

// Rotas públicas
router.post('/register', (req, res) => controller.register(req, res));
router.post('/login', (req, res) => controller.login(req, res));
router.get('/sellers', (req, res) => controller.getSellers(req, res));
router.post('/create-master', (req, res) => controller.createMaster(req, res));

// Rotas protegidas
router.get('/profile', authenticate, (req, res) => controller.profile(req, res));

export { router as authRouter };