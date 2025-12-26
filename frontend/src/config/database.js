// ===========================================
// CREDITHOPPER - PRISMA CLIENT SINGLETON
// ===========================================
// Lazy-loaded to prevent errors when DATABASE_URL is not set

const { PrismaClient } = require('@prisma/client');

// Prevent multiple instances in development (hot reload)
const globalForPrisma = global;

let prisma = null;

function getPrismaClient() {
  if (!prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    prisma = globalForPrisma.prisma || new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
    
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prisma;
    }
  }
  
  return prisma;
}

// Export a proxy that lazy-loads the client
module.exports = new Proxy({}, {
  get(target, prop) {
    const client = getPrismaClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
