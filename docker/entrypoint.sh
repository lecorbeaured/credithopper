#!/bin/sh
set -e

echo "🚀 Starting CreditHopper Backend..."

# Wait for database to be ready (optional but recommended)
echo "⏳ Waiting for database connection..."
sleep 2

# Run database migrations
echo "📦 Running database migrations..."
npm run migrate

# Start the application
echo "✅ Starting server..."
exec npm run start
