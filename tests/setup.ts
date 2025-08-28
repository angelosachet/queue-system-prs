import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TEST } },
  });
  (global as any).prisma = prisma;
});

afterEach(async () => {
  // Limpa dados de todas as tabelas usadas nos testes
  await prisma.player.deleteMany();
  // await prisma.user.deleteMany(); // se tiver auth
});

afterAll(async () => {
  await prisma.$disconnect();
});

declare global {
  var prisma: PrismaClient;
}
