# Deployment Guide for The Café Employee Management System

## Overview

The Café is a full-stack application with dual interfaces:
- **Desktop/Manager Portal**: React + Material-UI on port 5000
- **Mobile/Employee Portal**: React + Tailwind on port 5001 (development) or auto-detected on production

This guide covers deployment scenarios on Render and other platforms.

---

## Development Setup

### Local Development (Two Separate Servers)

```bash
# Install dependencies
npm install

# Start both servers concurrently (port 5000 = desktop, port 5001 = mobile)
npm run dev

# Or start individually
npm run dev:desktop      # Port 5000 - Manager/Admin UI
npm run dev:mobile       # Port 5001 - Employee/Mobile UI
```

**Access Points:**
- Desktop: `http://localhost:5000`
- Mobile: `http://localhost:5001`

---

## Production Deployment (Render)

### Architecture

On Render (and other single-port production environments), **both interfaces run from the same server instance**. The app automatically detects which UI to show based on:

1. **Server Environment Variable** (highest priority): `MOBILE_SERVER=true/false`
2. **URL Port Detection** (for localhost testing): Port 5001 = mobile, port 5000 = desktop
3. **User-Agent Detection** (fallback): Mobile browsers show mobile UI
4. **Query Parameter** (override): `?mobile=true` forces mobile UI

### Single Server Deployment (Recommended for Render)

#### Build Configuration

1. **Create `render.yaml` in project root:**

```yaml
services:
  - type: web
    name: the-cafe
    env: node
    buildCommand: npm run build
    startCommand: node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DATABASE_URL
        scope: build,runtime
        # Set your Neon PostgreSQL connection string
```

2. **Set environment variables on Render dashboard:**
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (required)
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (or your preferred port)

#### How It Works

When deployed with a single server instance:
- The server detects `NODE_ENV=production` and serves static files (not Vite dev server)
- Both desktop and mobile UIs are bundled into the same build
- The app auto-detects which interface to show:
  - Mobile browsers → Mobile UI
  - Desktop browsers → Desktop UI
  - Can be overridden with `?mobile=true` query param

#### Build Steps

```bash
# The build command runs:
npm run build

# Which executes:
# 1. npx vite build              → Compiles React to dist/public/
# 2. esbuild server/index.ts     → Bundles Express server to dist/index.js
# 3. Static files served from dist/public/
```

### Dual Server Deployment (Advanced)

If you want to maintain separate port-based instances on Render (less common):

```bash
# Server 1 (Manager Portal)
PORT=3000 NODE_ENV=production node dist/index.js

# Server 2 (Employee Portal)  
PORT=3001 NODE_ENV=production MOBILE_SERVER=true node dist/index.js
```

⚠️ **Note**: This requires Render's paid tier for multiple web services or a different approach.

---

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL (Neon) connection string
  - Format: `postgresql://user:password@host.region.aws.neon.tech/dbname`
  - Required for both development and production

### Optional
- `NODE_ENV`: `development` or `production` (default: development)
- `PORT`: Server port (default: 3000)
- `MOBILE_SERVER`: Set to `true` for employee-only server, `false` for manager/admin
- `FRESH_DB`: Set to `true` to reset database on startup

### Blockchain (Optional)
- `BLOCKCHAIN_NETWORK`: Ethereum network (default: sepolia)
- `BLOCKCHAIN_RPC_URL`: RPC endpoint URL
- `BLOCKCHAIN_CONTRACT_ADDRESS`: Contract address
- `BLOCKCHAIN_PRIVATE_KEY`: Signing key (if needed)

---

## Database Setup

### PostgreSQL (Production - Neon)

1. **Create Neon project**: https://neon.tech
2. **Get connection string**: `postgresql://...`
3. **Set DATABASE_URL** on Render
4. **Run migrations** (automatic on startup)

### SQLite (Development)

1. **Automatic**: Database created on first run
2. **Location**: `sqlite.db` in project root
3. **Reset**: `npm run db:reset` or delete `sqlite.db`

---

## Deployment Checklist

- [ ] Set `DATABASE_URL` environment variable with Neon PostgreSQL
- [ ] Set `NODE_ENV=production`
- [ ] Run `npm install` to verify dependencies
- [ ] Run `npm run build` locally to verify build works
- [ ] Push to GitHub and connect Render
- [ ] Render auto-deploys on git push
- [ ] Test both interfaces:
  - Desktop: `https://your-app.render.com` (or visit from desktop browser)
  - Mobile: Same URL from mobile device browser

---

## Troubleshooting

### Issue: Seeing Desktop UI on Mobile Device

**Solution**: The mobile UI should auto-detect on mobile browsers. If not:
1. Hard refresh page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Manually add `?mobile=true` to URL
3. Check browser's User-Agent (should contain "Android" or "iPhone")

### Issue: Database Errors on Render

**Solution**: 
1. Verify `DATABASE_URL` is set and valid
2. Check Neon dashboard for connection limits
3. Enable connection pooling in Neon settings
4. For SQLite fallback: Render filesystem is ephemeral; PostgreSQL is required for persistence

### Issue: Build Fails on Render

**Solution**:
1. Run `npm run check` locally to verify TypeScript
2. Run `npm run build` locally to test build
3. Check Render build logs for specific errors
4. Ensure all environment variables are set

### Issue: 404 Errors After Deployment

**Solution**: This is normal for single-page app routing
- Server is configured to fallback to `index.html` for unknown routes
- This enables client-side routing with wouter

---

## Testing Before Deployment

### Local Build Test

```bash
# Build for production
npm run build

# Serve built app
npm start

# Visit http://localhost:3000
```

### Mobile UI Testing

```bash
# Option 1: Use query param
http://localhost:3000?mobile=true

# Option 2: Chrome DevTools mobile emulation
# Dev Tools → Toggle Device Toolbar (Ctrl+Shift+M)

# Option 3: Use dev servers
npm run dev:mobile    # http://localhost:5001
```

---

## Rollback Procedure

On Render:
1. Go to Deployments section
2. Click previous working deployment
3. Click "Deploy" to rollback

---

## Performance Tips

1. **Database Indexing**: Add indexes for frequently queried fields
2. **Session Store**: Consider Redis for session storage at scale (currently using PostgreSQL)
3. **Caching**: Implement cache headers for static assets
4. **CDN**: Use Render's built-in CDN or Cloudflare

---

## Security Checklist

- [ ] Database URL is not committed (use environment variables)
- [ ] Blockchain keys not in source code
- [ ] HTTPS enforced (automatic on Render)
- [ ] CORS properly configured
- [ ] Session cookies marked `httpOnly` and `secure`
- [ ] Admin credentials changed from defaults

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Vite Guide**: https://vitejs.dev/guide/
- **Express Guide**: https://expressjs.com/

