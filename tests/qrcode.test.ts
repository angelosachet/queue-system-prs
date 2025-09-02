import request from 'supertest';
import { app } from '../src/app';

describe('QR Code System', () => {
  beforeEach(async () => {
    await global.prisma.user.deleteMany();
  });

  it('should generate QR code for seller', async () => {
    // Create seller
    const seller = await global.prisma.user.create({
      data: {
        name: 'Test Seller',
        email: 'seller@test.com',
        password: 'password',
        role: 'SELLER'
      }
    });

    const res = await request(app).get(`/sellers/${seller.id}/qrcode`);

    expect(res.status).toBe(200);
    expect(res.body.sellerId).toBe(seller.id);
    expect(res.body.sellerName).toBe('Test Seller');
    expect(res.body.registerUrl).toContain(`PRS%28${seller.id}%29`);
    expect(res.body.registerUrl).toContain('wa.me');
    expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  it('should return 404 for non-existent seller', async () => {
    const res = await request(app).get('/sellers/999/qrcode');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Seller not found');
  });

  it('should return 404 for non-seller user', async () => {
    // Create regular player
    const player = await global.prisma.user.create({
      data: {
        name: 'Test Player',
        email: 'player@test.com',
        password: 'password',
        role: 'PLAYER'
      }
    });

    const res = await request(app).get(`/sellers/${player.id}/qrcode`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Seller not found');
  });

  it('should list seller referrals', async () => {
    // Create seller
    const seller = await global.prisma.user.create({
      data: {
        name: 'Test Seller',
        email: 'seller@test.com',
        password: 'password',
        role: 'SELLER'
      }
    });

    // Create referred player
    await global.prisma.user.create({
      data: {
        name: 'Referred Player',
        email: 'referred@test.com',
        password: 'password',
        role: 'PLAYER',
        sellerId: seller.id
      }
    });

    const res = await request(app).get(`/sellers/${seller.id}/referrals`);

    expect(res.status).toBe(200);
    expect(res.body.sellerId).toBe(seller.id);
    expect(res.body.totalReferrals).toBe(1);
    expect(res.body.referrals[0].name).toBe('Referred Player');
  });
});