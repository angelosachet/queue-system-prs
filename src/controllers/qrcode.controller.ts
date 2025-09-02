import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};

export class QRCodeController {
  async generateSellerQRCode(req: Request, res: Response) {
    try {
      const sellerId = Number(req.params.sellerId);
      
      if (isNaN(sellerId)) {
        return res.status(400).json({ error: 'Invalid seller ID' });
      }

      const prisma = getPrismaClient();
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

      const prisma = getPrismaClient();
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