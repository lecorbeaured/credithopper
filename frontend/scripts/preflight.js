#!/usr/bin/env node

/**
 * Preflight Check Script
 * 
 * Validates required environment variables before starting the application.
 * Fails fast with clear error messages to prevent confusing restart loops.
 */

const requiredEnvVars = [
  {
    name: 'DATABASE_URL',
    description: 'PostgreSQL connection string',
    example: 'postgresql://user:password@host:5432/database'
  }
];

const recommendedEnvVars = [
  {
    name: 'JWT_SECRET',
    description: 'Secret key for JWT tokens',
    example: 'your-super-secret-key-at-least-32-characters'
  },
  {
    name: 'NODE_ENV',
    description: 'Environment mode',
    example: 'production'
  }
];

console.log('\n🔍 Running preflight checks...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required environment variables
console.log('Required Environment Variables:');
console.log('─'.repeat(50));

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar.name];
  
  if (!value || value.trim() === '') {
    console.log(`❌ ${envVar.name} - MISSING`);
    console.log(`   Description: ${envVar.description}`);
    console.log(`   Example: ${envVar.example}`);
    console.log('');
    hasErrors = true;
  } else {
    // Mask sensitive values in output
    const maskedValue = value.substring(0, 15) + '...';
    console.log(`✅ ${envVar.name} - Set (${maskedValue})`);
  }
}

console.log('');

// Check recommended environment variables
console.log('Recommended Environment Variables:');
console.log('─'.repeat(50));

for (const envVar of recommendedEnvVars) {
  const value = process.env[envVar.name];
  
  if (!value || value.trim() === '') {
    console.log(`⚠️  ${envVar.name} - Not set (using default)`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${envVar.name} - Set`);
  }
}

console.log('');

// Final verdict
if (hasErrors) {
  console.log('─'.repeat(50));
  console.log('❌ PREFLIGHT CHECK FAILED');
  console.log('');
  console.log('Missing required environment variables.');
  console.log('Please configure them in your hosting platform:');
  console.log('');
  console.log('Railway:');
  console.log('  1. Go to your project → Variables tab');
  console.log('  2. Add DATABASE_URL = ${{Postgres.DATABASE_URL}}');
  console.log('  3. Or paste your PostgreSQL connection string');
  console.log('');
  console.log('Docker:');
  console.log('  docker run -e DATABASE_URL="postgresql://..." your-image');
  console.log('');
  console.log('Render/Fly/Vercel:');
  console.log('  Add DATABASE_URL in the Environment Variables section');
  console.log('');
  process.exit(1);
}

if (hasWarnings) {
  console.log('⚠️  Preflight completed with warnings');
} else {
  console.log('✅ All preflight checks passed!');
}

console.log('');
