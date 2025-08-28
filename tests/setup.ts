// tests/setup.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TEST } },
  });
  (global as any).prisma = prisma;
});

beforeEach(async () => {
  // Limpa tabelas na ordem correta para não quebrar FKs
  await prisma.queue.deleteMany();
  await prisma.player.updateMany({ data: { simulatorId: null } });
  await prisma.player.deleteMany();
  await prisma.simulator.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

declare global {
  var prisma: PrismaClient;
}
