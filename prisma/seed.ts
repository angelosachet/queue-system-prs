import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  // Only seed if using test database
  if (process.env.NODE_ENV === 'test' || process.env.DATABASE_URL?.includes('test')) {
    console.log('Seeding test database...');
    
    const seedSQL = readFileSync(join(__dirname, '..', 'seed-data.sql'), 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = seedSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(statement);
      }
    }
    
    console.log('Test database seeded successfully');
  } else {
    console.log('Skipping seed - not in test environment');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });