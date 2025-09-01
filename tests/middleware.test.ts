import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Auth Middleware', () => {
  let masterToken: string;
  let playerToken: string;

  beforeEach(async () => {
    await prisma.queue.deleteMany();
    await prisma.user.deleteMany();

    const users = await prisma.user.createMany({
      data: [
        {
          name: 'Master User',
          email: 'master@test.com',
          password: 'hashedpass',
          role: UserRole.MASTER
        },
        {
          name: 'Player User',
          email: 'player@test.com',
          password: 'hashedpass',
          role: UserRole.PLAYER
        }
      ]
    });

    masterToken = jwt.sign({ userId: 1, role: UserRole.MASTER }, JWT_SECRET);
    playerToken = jwt.sign({ userId: 2, role: UserRole.PLAYER }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should require token for protected routes', async () => {
      const response = await request(app)
        .get('/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });

    it('should accept valid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${playerToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });
});