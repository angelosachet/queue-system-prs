import { Router } from 'express';
import { QRCodeController } from '../controllers/qrcode.controller';

const router = Router();
const controller = new QRCodeController();

// Gerar QR Code do vendedor
router.get('/sellers/:sellerId/qrcode', controller.generateSellerQRCode);

// Listar indicações do vendedor
router.get('/sellers/:sellerId/referrals', controller.getSellerReferrals);

export { router as qrcodeRoutes };