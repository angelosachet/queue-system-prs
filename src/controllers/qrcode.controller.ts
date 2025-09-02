import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = (global as any).prisma ?? new PrismaClient();

export class QRCodeController {
  async generateSellerQRCode(req: Request, res: Response) {
    try {
      const sellerId = Number(req.params.sellerId);
      
      if (isNaN(sellerId)) {
        return res.status(400).json({ error: 'Invalid seller ID' });
      }

      // Validar se seller existe
      const seller = await prisma.user.findUnique({
        where: { id: sellerId, role: 'SELLER' }
      });
      
      if (!seller) {
        return res.status(404).json({ error: 'Seller not found' });
      }
      
      // Gerar URL do WhatsApp com referência
      const whatsappNumber = process.env.WHATSAPP_NUMBER || '554884549312';
      const registerUrl = `https://wa.me/${whatsappNumber}?text=PRS%28${sellerId}%29`;
      
      // Gerar QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(registerUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return res.json({
        sellerId,
        sellerName: seller.name,
        registerUrl,
        qrCode: qrCodeDataUrl
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getSellerReferrals(req: Request, res: Response) {
    try {
      const sellerId = Number(req.params.sellerId);
      
      if (isNaN(sellerId)) {
        return res.status(400).json({ error: 'Invalid seller ID' });
      }

      const referrals = await prisma.user.findMany({
        where: { sellerId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        sellerId,
        totalReferrals: referrals.length,
        referrals
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}