import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth System', () => {
  beforeEach(async () => {
    await prisma.queue.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /auth/register', () => {
    it('should register a new player', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test Player',
          email: 'player@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('PLAYER');
      expect(response.body.data.token).toBeDefined();
    });

    it('should register player with seller indication', async () => {
      const seller = await prisma.user.create({
        data: {
          name: 'Test Seller',
          email: 'seller@test.com',
          password: 'hashedpass',
          role: UserRole.SELLER
        }
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test Player',
          email: 'player@test.com',
          password: 'password123',
          sellerId: seller.id
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.sellerId).toBe(seller.id);
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123'
        });

      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Another User',
          email: 'test@test.com',
          password: 'password456'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/sellers', () => {
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
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'hashedpass',
            role: UserRole.ADMIN
          }
        ]
      });
    });

    it('should return only sellers', async () => {
      const response = await request(app)
        .get('/auth/sellers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].role).toBe('SELLER');
    });
  });
});