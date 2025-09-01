import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

describe('User Roles and Seller System', () => {
  beforeEach(async () => {
    await prisma.queue.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Role Registration', () => {
    it('should create user with MASTER role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Master User',
          email: 'master@test.com',
          password: 'password123',
          role: 'MASTER'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe('MASTER');
    });

    it('should create user with SELLER role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Seller User',
          email: 'seller@test.com',
          password: 'password123',
          role: 'SELLER'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe('SELLER');
    });

    it('should default to PLAYER role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Default User',
          email: 'default@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe('PLAYER');
    });
  });

  describe('Seller Indication System', () => {
    let sellerId: number;

    beforeEach(async () => {
      const seller = await prisma.user.create({
        data: {
          name: 'Test Seller',
          email: 'seller@test.com',
          password: 'hashedpass',
          role: UserRole.SELLER
        }
      });
      sellerId = seller.id;
    });

    it('should link player to seller', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Player User',
          email: 'player@test.com',
          password: 'password123',
          sellerId: sellerId
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.sellerId).toBe(sellerId);

      // Verify in database
      const player = await prisma.user.findUnique({
        where: { email: 'player@test.com' },
        include: { seller: true }
      });

      expect(player?.sellerId).toBe(sellerId);
      expect(player?.seller?.role).toBe('SELLER');
    });

    it('should reject non-existent seller', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Player User',
          email: 'player@test.com',
          password: 'password123',
          sellerId: 999
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid seller ID');
    });

    it('should reject non-seller user as seller', async () => {
      const admin = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'hashedpass',
          role: UserRole.ADMIN
        }
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Player User',
          email: 'player@test.com',
          password: 'password123',
          sellerId: admin.id
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid seller ID');
    });
  });

  describe('Seller Listing', () => {
    beforeEach(async () => {
      await prisma.user.createMany({
        data: [
          {
            name: 'Seller 1',
            email: 'seller1@test.com',
            password: 'hashedpass',
            role: UserRole.SELLER
          },
          {
            name: 'Seller 2',
            email: 'seller2@test.com',
            password: 'hashedpass',
            role: UserRole.SELLER
          },
          {
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'hashedpass',
            role: UserRole.ADMIN
          },
          {
            name: 'Player User',
            email: 'player@test.com',
            password: 'hashedpass',
            role: UserRole.PLAYER
          }
        ]
      });
    });

    it('should return only sellers', async () => {
      const response = await request(app)
        .get('/auth/sellers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('SELLER');
        expect(user.password).toBeUndefined(); // Password should not be returned
      });
    });

    it('should return empty array when no sellers exist', async () => {
      await prisma.user.deleteMany({ where: { role: UserRole.SELLER } });

      const response = await request(app)
        .get('/auth/sellers');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });
});