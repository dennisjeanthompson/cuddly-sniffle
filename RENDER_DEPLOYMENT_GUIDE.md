# Render Deployment Guide - The Café Payroll System

## Quick Start - Deploy to Render

### Prerequisites
1. GitHub account with the repository pushed
2. Render account (https://render.com)
3. PostgreSQL database (using Neon recommended)

### Step 1: Set Up PostgreSQL Database on Neon

1. Go to https://neon.tech and sign up
2. Create a new project
3. Copy your connection string (looks like: `postgresql://...`)
4. You'll use this as the `DATABASE_URL` environment variable

### Step 2: Deploy on Render

#### Option A: Using render.yaml (Recommended)

1. Push your code to GitHub:
   ```bash
   git add -A
   git commit -m "Fix employee CRUD operations"
   git push origin main
   ```

2. Go to https://render.com/dashboard
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will detect `render.yaml` and auto-configure with:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Port: 10000

6. In Environment variables section, add:
   ```
   NODE_ENV          = production
   DATABASE_URL      = postgresql://user:password@host/database (from Neon)
   PORT              = 10000
   ```

7. Click "Deploy" and wait ~5-10 minutes

#### Option B: Manual Deployment

1. Create new Web Service on Render
2. Select "Node.js"
3. Repository: Select your GitHub repo
4. Root Directory: `The Cafe/The Cafe`
5. Build Command: `npm install && npm run build`
6. Start Command: `npm start`
7. Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Neon connection string
   - `PORT`: `10000`

### Step 3: Configure Environment

In Render dashboard for your web service:

1. Go to Environment tab
2. Add these variables:
   ```
   DATABASE_URL  = postgresql://... (from Neon)
   NODE_ENV      = production
   PORT          = 10000
   ```

3. Add Neon PostgreSQL connection string from https://console.neon.tech

### Step 4: Verify Deployment

Once deployment completes:
1. View the live URL in Render dashboard
2. Try accessing: `https://your-app.onrender.com`
3. Login screen should appear

### Step 5: Initialize Database

When first accessed, the app will:
1. Create all necessary tables
2. Seed initial data
3. Set up deduction rates
4. Load Philippine holidays

## Troubleshooting

### Build Fails
**Error:** "npm not found" or "build failed"
- Check Node version: Render uses Node 18+ by default
- Ensure package.json exists and has valid JSON syntax
- Check package-lock.json isn't corrupted

**Solution:**
```bash
rm package-lock.json
npm install
git add package-lock.json
git push
```

### Database Connection Error
**Error:** "Cannot connect to database"
- Verify DATABASE_URL environment variable is set
- Check Neon connection string format
- Ensure Neon database is created and accessible

**Solution:**
1. In Neon console, test connection
2. Copy full connection string (including password)
3. Update in Render environment variables
4. Redeploy

### Port Already in Use
**Error:** "Port 10000 already in use"
- Render automatically assigns available ports
- Check render.yaml PORT matches environment

### CORS Errors
If frontend and backend are on different domains:
- Ensure CORS is configured in `server/routes.ts`
- The app handles CORS for both localhost and production URLs

## Database Initialization

The app automatically on startup:
1. Creates tables if they don't exist
2. Seeds deduction rates
3. Seeds Philippine holidays
4. Seeds sample users (manager + employees)

To reset database (for testing):
1. Delete all tables in Neon console
2. Redeploy the app
3. It will recreate tables and seed data

## Production Monitoring

Monitor your deployment:
1. **Render Dashboard:**
   - Check deployment status
   - View real-time logs
   - Monitor CPU/Memory usage

2. **Performance:**
   - Typical response time: <500ms
   - Database queries: <200ms average
   - Login: ~2-3 seconds

3. **Logs:**
   - Access logs in Render dashboard → Logs tab
   - Check for database connection errors
   - Monitor authentication issues

## Scaling Tips

### For High Traffic
1. Upgrade Neon database plan
2. Enable Neon's auto-scaling
3. Consider Render Pro for always-on service

### Database Optimization
1. Add indexes to frequently queried columns
2. Archive old payroll data
3. Use connection pooling (Neon includes this)

### Performance Tuning
1. Enable response compression (already configured)
2. Cache static assets
3. Optimize database queries

## Security Checklist

Before going live:
- [ ] Set strong passwords for all users
- [ ] Configure HTTPS (automatic on Render)
- [ ] Set up environment variables correctly
- [ ] Remove debug logging in production
- [ ] Enable input validation
- [ ] Implement rate limiting
- [ ] Set up database backups in Neon

## Render Configuration Details

### Current Production Deployment

**Service Details:**
- **Service Name:** donmacchiatos
- **Service ID:** srv-d4p54h3e5dus7381rtpg
- **Repository:** dennisjeanthompson/cuddly-sniffle
- **Branch:** main
- **Live URL:** https://donmacchiatos.onrender.com
- **Instance Type:** Free (0.1 CPU, 512 MB RAM)
- **Region:** Oregon (US West)

### Build Configuration

**Root Directory:**
```
The Cafe/The Cafe
```

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm run start
```

### Auto-Deployment

- **Auto-Deploy:** Currently OFF (manual deploy mode)
- **Deploy Hook:** Available (keep secret)
- **Git Credentials:** dst8336@students.uc-bcf.edu.ph

To enable auto-deploy:
1. Go to Render dashboard → Settings
2. Find "Auto-Deploy" section
3. Toggle to "On"
4. Now every `git push` to main will automatically redeploy

### Monitoring & Health Checks

- **Health Check Path:** `/healthz`
- **Notifications:** Configured for failure notifications
- **Logs:** Real-time accessible in Render dashboard

### Build & Deploy Settings

| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Root Directory | `The Cafe/The Cafe` |
| Environment | production |
| Node Version | 22.x (auto-detected) |

### Environment Variables Required

Set these in Render Dashboard → Environment:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host/database
PORT=10000
```

### Scaling Information

**Current Limits (Free Tier):**
- CPU: 0.1 shared CPU
- Memory: 512 MB
- Included free hours: 750 hours/month
- Bandwidth: Unlimited
- No custom domains on free tier

**To upgrade:**
1. In Render dashboard, click "Upgrade"
2. Select instance type (Pro $7/month recommended)
3. Gain: Full CPU, 2GB RAM, Always-on service
4. Custom domains become available

### PR Previews

Currently disabled. To enable:
1. Settings → PR Previews
2. Choose "Automatic" or "Manual"
3. Automatic: Preview every PR
4. Manual: Only PRs with [render preview] in title

### Edge Caching

Available on paid instances only. Improves static asset delivery for:
- JS bundles (vendors-*.js, main-*.js)
- CSS files
- Images and fonts

## Maintenance

### Regular Tasks
1. Monitor database size
2. Review access logs
3. Update dependencies: `npm audit`
4. Backup data regularly (Neon handles this)

### Updates
To deploy updates:
1. Make code changes
2. Push to GitHub: `git push origin main`
3. Render auto-deploys on push (with auto-deploy enabled)
4. Monitor deployment status

### Rollback
If deployment fails:
1. In Render dashboard, select previous deployment
2. Click "Deploy"
3. Previous version will be restored

## Support & Resources

- Render Documentation: https://render.com/docs
- Neon Documentation: https://neon.tech/docs
- Node.js Best Practices: https://nodejs.org/en/docs/guides/
- Express.js Docs: https://expressjs.com

## API Documentation

Available endpoints:
```
Authentication
POST   /api/login                        - User login
POST   /api/logout                       - User logout

Employees
GET    /api/employees                    - List employees
POST   /api/employees                    - Create employee
GET    /api/employees/:id                - Get employee details
PUT    /api/employees/:id                - Update employee
DELETE /api/employees/:id                - Delete employee

Schedules
GET    /api/shifts                       - List shifts
POST   /api/shifts                       - Create shift
```

Full API docs available at `/api/docs` (if Swagger configured)

## Contact & Support

For deployment issues:
1. Check Render dashboard logs
2. Verify environment variables
3. Test database connection
4. Review this guide's troubleshooting section
