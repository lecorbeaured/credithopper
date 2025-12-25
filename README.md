# CreditHopper Backend API

Credit repair platform backend - Node.js + Express + PostgreSQL + Prisma

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Railway recommended)
- Anthropic API key (for Claude letter generation)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
# - DATABASE_URL: Your PostgreSQL connection string
# - JWT_SECRET: Random secret string
# - ANTHROPIC_API_KEY: Your Claude API key

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | Yes (production) |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

## 📁 Project Structure

```
credithopper-backend/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── config/            # Configuration
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utilities
│   ├── app.js             # Express app setup
│   └── index.js           # Entry point
├── uploads/               # Uploaded files
├── .env.example           # Environment template
├── .gitignore
└── package.json
```

## 🔗 API Endpoints

### Health Check
- `GET /health` - Server status

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Credit Reports
- `POST /api/reports/upload` - Upload credit report PDF
- `GET /api/reports` - List user's reports
- `GET /api/reports/:id` - Get report details
- `POST /api/reports/:id/parse` - Parse report
- `DELETE /api/reports/:id` - Delete report

### Negative Items
- `GET /api/items` - List negative items
- `GET /api/items/:id` - Get item details
- `GET /api/items/:id/analyze` - Get timing analysis
- `PATCH /api/items/:id` - Update item

### Disputes
- `POST /api/disputes` - Create dispute
- `GET /api/disputes` - List disputes
- `GET /api/disputes/:id` - Get dispute details
- `GET /api/disputes/:id/letter` - Generate letter
- `POST /api/disputes/:id/response` - Log response
- `POST /api/disputes/:id/advance` - Advance to next round

### Letters
- `POST /api/letters/generate` - Generate dispute letter
- `GET /api/letters/templates` - List templates

## 🛠️ Scripts

```bash
npm run dev          # Start with hot reload
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

## 🚢 Deployment (Railway)

1. Push code to GitHub
2. Create new project in Railway
3. Add PostgreSQL service
4. Add Node.js service from GitHub repo
5. Add environment variables
6. Deploy!

## 📝 License

UNLICENSED - Proprietary
