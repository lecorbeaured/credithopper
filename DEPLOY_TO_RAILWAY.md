# CreditHopper - Railway Deployment Guide

## What Changed

The frontend and backend are now **unified**. Express serves both:
- **API routes** → `/api/*`
- **Frontend files** → Everything else (HTML, CSS, JS)

This eliminates CORS issues and sync problems.

---

## Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
# In your local project folder
git add .
git commit -m "Unified frontend + backend deployment"
git push origin main
```

### Step 2: Railway Auto-Deploys

If your Railway project is connected to GitHub, it will automatically:
1. Detect the new code
2. Run `npm install`
3. Run `npx prisma generate`
4. Start the server with `npm start`

### Step 3: Verify Deployment

Once deployed, visit your Railway URL:
- **Homepage**: `https://your-app.up.railway.app/`
- **Login**: `https://your-app.up.railway.app/login.html`
- **Dashboard**: `https://your-app.up.railway.app/dashboard.html`
- **API Health**: `https://your-app.up.railway.app/api/health`

---

## Environment Variables (Railway Dashboard)

Make sure these are set in Railway → Variables:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-here
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
PORT=3000
```

---

## Project Structure

```
credithopper-backend/
├── frontend/           # ← Static files served by Express
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── engine-v2.html
│   ├── css/
│   └── js/
├── src/                # ← Backend API
│   ├── app.js          # Express app (serves frontend + API)
│   ├── routes/
│   ├── controllers/
│   └── services/
├── prisma/
│   └── schema.prisma
└── package.json
```

---

## How It Works Now

1. User visits `https://your-app.up.railway.app/`
2. Express serves `frontend/index.html`
3. User clicks "Login" → Express serves `frontend/login.html`
4. Login form calls `/api/auth/login` → Express handles API request
5. **Same origin** = No CORS issues!

---

## Troubleshooting

### "Cannot GET /dashboard"
- Make sure `dashboard.html` exists in the `frontend/` folder
- Check Railway logs for errors

### API returns 404
- Ensure route starts with `/api/`
- Check that the route is registered in `app.js`

### CSS/JS not loading
- Check browser console for 404 errors
- Verify file paths in HTML are relative (e.g., `css/styles.css` not `/css/styles.css`)

### Database errors
- Verify `DATABASE_URL` is set in Railway
- Run migrations: Railway should auto-run `prisma generate`

---

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev

# Visit http://localhost:3000
```

---

## URLs After Deployment

| Page | URL |
|------|-----|
| Homepage | `https://your-app.up.railway.app/` |
| Login | `https://your-app.up.railway.app/login.html` |
| Register | `https://your-app.up.railway.app/register.html` |
| Dashboard | `https://your-app.up.railway.app/dashboard.html` |
| Credit Engine | `https://your-app.up.railway.app/engine-v2.html` |
| API Health | `https://your-app.up.railway.app/api/health` |

---

## Done! 🚀

Your CreditHopper app is now fully unified. Frontend and backend live together, no more sync issues.
