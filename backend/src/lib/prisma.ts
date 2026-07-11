import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load env immediately so DATABASE_URL is available
dotenv.config();

function createPrismaClient() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') globalForPrisma.prisma = prisma;
