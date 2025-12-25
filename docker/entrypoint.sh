#!/bin/sh
set -e

echo "🚀 Starting CreditHopper Backend..."

# Run the production start script which includes:
# 1. Preflight check (validates DATABASE_URL exists)
# 2. Database migrations
# 3. Server start
exec npm run start:prod
