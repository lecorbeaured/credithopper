// ===========================================
// CREDITHOPPER - SERVER ENTRY POINT
// ===========================================

const app = require('./app');
const config = require('./config');
const prisma = require('./config/database');

// ===========================================
// DATABASE CONNECTION
// ===========================================

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===========================================
// START SERVER
// ===========================================

async function startServer() {
  console.log('\n===========================================');
  console.log('   CREDITHOPPER API SERVER');
  console.log('===========================================\n');
  
  // Connect to database
  const dbConnected = await connectDatabase();
  
  if (!dbConnected && config.env === 'production') {
    console.error('Cannot start server without database connection');
    process.exit(1);
  }
  
  // Start Express server
  app.listen(config.port, () => {
    console.log(`\n🚀 Server running on port ${config.port}`);
    console.log(`📍 Environment: ${config.env}`);
    console.log(`🔗 Health check: http://localhost:${config.port}/health`);
    console.log(`📚 API docs: http://localhost:${config.port}/api`);
    console.log('\n===========================================\n');
  });
}

// Run
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
