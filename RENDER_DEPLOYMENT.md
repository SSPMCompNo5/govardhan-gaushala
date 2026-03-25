# Deploying Govardhan Goshala to Render

This guide walks you through deploying the Goshala management system on Render with external MongoDB and Redis services.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Render (Next.js App)            │
│  - Web Service (Node.js)                │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┬──────────────┐
       ▼               ▼              ▼
   MongoDB Atlas   Upstash Redis   External Services
   (Database)      (Cache)         (Twilio, etc.)
```

## Prerequisites

1. **GitHub Account** – Push your repo to GitHub
2. **Render Account** – Free tier available at https://render.com
3. **MongoDB Atlas Account** – Free tier at https://www.mongodb.com/cloud/atlas
4. **Upstash Account** – Free tier at https://upstash.com (for Redis cache)

## Step-by-Step Setup

### Step 1: Prepare Your Git Repository

```bash
# Ensure everything is committed
git add .
git commit -m "Setup for Render deployment"
git push origin main
```

### Step 2: Create MongoDB Atlas Cluster (Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Create a new **Free cluster** (M0 tier)
4. Wait 5-10 minutes for cluster to provision
5. Click **Connect**:
   - Select "Connect your application"
   - Choose **Node.js** driver
   - Copy the connection string (will look like):
     ```
     mongodb+srv://username:password@cluster.mongodb.net/goshala?retryWrites=true&w=majority
     ```
   - Save this – you'll need it for Render

**Important**: In Atlas, go to **Database Access** and create a database user with strong password. Update the connection string with actual `username:password`.

### Step 3: Create Upstash Redis Instance (Free Tier)

1. Go to https://upstash.com
2. Sign up or log in
3. Create a new **Free Redis database**
4. Copy the **REST URL** and **REST Token** (under Details)
5. Save these – you'll need them for Render

Alternatively, use **Redis Cloud** (https://redis.com/cloud/) if you prefer standard Redis protocol (requires `REDIS_URL` instead).

### Step 4: Deploy on Render

#### Option A: Using render.yaml (Recommended)

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Select the branch (e.g., `main`)
5. Fill in:
   - **Name**: `goshala-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` or `Standard` (free has 512MB RAM, may be tight)

6. Click **Advanced** and add **Environment Variables**:

   ```
   NODE_ENV = production
   MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/goshala?retryWrites=true&w=majority
   MONGODB_DB = goshala
   NEXTAUTH_URL = https://your-render-url.onrender.com (set after deployment)
   NEXTAUTH_SECRET = (generate at https://generate-secret.vercel.app/32)
   JWT_SECRET = (generate at https://generate-secret.vercel.app/32)
   UPSTASH_REDIS_REST_URL = (from Upstash dashboard)
   UPSTASH_REDIS_REST_TOKEN = (from Upstash dashboard)
   ```

7. Click **Create Web Service**
8. Wait 5-10 minutes for build to complete
9. Once deployed, copy the **Public URL** (e.g., `https://goshala-app.onrender.com`)
10. Update the **NEXTAUTH_URL** environment variable to this URL
11. Trigger a redeploy in Render settings

#### Option B: Using Render Dashboard

If render.yaml isn't working, manually set in Render dashboard:

1. Navigate to your Web Service settings
2. Go to **Environment**
3. Add all variables listed above
4. Update **Build Command** and **Start Command**

### Step 5: Initialize Database

The app will auto-initialize on first run, but to manually seed:

1. Once app is deployed, visit: `https://your-app.onrender.com/api/admin/init-indexes`
2. Or manually call the init endpoint with curl:
   ```bash
   curl -X POST https://your-app.onrender.com/api/admin/init-indexes \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Step 6: Verify Deployment

1. Visit `https://your-app.onrender.com`
2. Log in with default credentials: `admin` / `admin123`
3. Check logs in Render dashboard if issues occur

## Environment Variables Explanation

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/goshala?retryWrites=true&w=majority` |
| `MONGODB_DB` | Database name | `goshala` |
| `NEXTAUTH_URL` | Your app's public URL | `https://goshala-app.onrender.com` |
| `NEXTAUTH_SECRET` | JWT signing secret (must be strong) | Random 32-char string |
| `JWT_SECRET` | Alternative JWT secret | Random 32-char string |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token | Bearer token |

## Troubleshooting

### Build Fails with "Out of memory"
- **Solution**: Use **Standard** plan ($7/month) instead of Free
- Render Free tier has limited RAM for build process

### App crashes immediately
- Check logs: Render Dashboard → Your Service → Logs
- Common issues:
  - `MONGODB_URI` is invalid or unreachable
  - `NEXTAUTH_SECRET` not set
  - Redis connection timeout

### CSRF token errors
- Ensure `NEXTAUTH_URL` matches your actual Render URL (https)
- Cookies are strict; must be HTTPS in production

### Database connection timeout
- Whitelist Render IP in MongoDB Atlas:
  1. Go to MongoDB Atlas Dashboard
  2. Network Access → Add IP Address
  3. Add `0.0.0.0/0` (allow all) for free tier, or Render's IP range

### Redis connection refused
- Ensure `UPSTASH_REDIS_REST_URL` and token are correct
- Upstash free tier has rate limits; monitor usage

## Scaling & Production Improvements

1. **Upgrade Plans**:
   - Render: Use **Standard** ($7/month) or **Pro** for production
   - MongoDB: Upgrade from M0 to M2 (paid)
   - Upstash: Paid plans for higher throughput

2. **Database Backups**:
   - MongoDB Atlas has automatic backups
   - Enable in Database settings

3. **Monitoring**:
   - Render provides logs and error tracking
   - Add Sentry for error reporting (already in package.json)

4. **Custom Domain**:
   - In Render: Settings → Custom Domain
   - Point your domain's DNS to Render

## Useful Commands

```bash
# Local testing before deployment
npm run build
npm start

# Check if environment is correct
npm run setup:validate

# View production logs
# Use Render Dashboard → Logs tab
```

## Support

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas**: https://docs.mongodb.com/atlas/
- **Upstash**: https://docs.upstash.com/
- **Next.js Production**: https://nextjs.org/docs/deployment

---

**You're all set! Your Goshala is now on the cloud. 🚀**
