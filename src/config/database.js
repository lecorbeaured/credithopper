// ===========================================
// CREDITHOPPER - PRISMA CLIENT SINGLETON
// ===========================================
// Prevents multiple Prisma Client instances in development

const { PrismaClient } = require('@prisma/client');

// Prevent multiple instances in development (hot reload)
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
