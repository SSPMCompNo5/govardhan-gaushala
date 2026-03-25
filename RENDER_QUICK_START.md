# 🚀 Render Deployment - Quick Start

Your Govardhan Goshala repo is now configured for Render deployment!

## What Was Set Up

✅ **render.yaml** - Render service configuration (auto-builds & deploys)
✅ **Next.js Standalone Mode** - Optimized for production servers
✅ **Environment Template** - All required variables documented
✅ **Deployment Guides** - Step-by-step instructions
✅ **Production Guide** - Monitoring, scaling, troubleshooting tips
✅ **Deployment Checklist** - Quick reference for all steps

## Files Added

| File | Purpose |
|------|---------|
| [`render.yaml`](render.yaml) | Render service definition (deploy directly from git) |
| [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md) | Complete deployment guide (30 min read) |
| [`RENDER_CHECKLIST.md`](RENDER_CHECKLIST.md) | Quick checklist (2 min) |
| [`RENDER_PRODUCTION.md`](RENDER_PRODUCTION.md) | Production best practices |
| [`env.render.example`](env.render.example) | Environment variables template |

## 30-Second Overview

```
1. Set up MongoDB (MongoDB Atlas - free tier)
   └─ Get: mongodb+srv://username:password@...

2. Set up Redis (Upstash - free tier)
   └─ Get: REST URL + Token

3. Push code to GitHub
   └─ Your Render deployment trigger

4. Create service on Render.com
   └─ Choose: Web Service → Node.js → Your GitHub repo

5. Add environment variables
   └─ MONGODB_URI, UPSTASH_REDIS_REST_*, NEXTAUTH_SECRET, NEXTAUTH_URL

6. Deploy
   └─ Render auto-builds and starts your app (5-10 min)

7. Done! 🎉
```

## Next Steps

### ⏱️ If you have 5 minutes:
1. Push code to GitHub: `git push origin main`
2. Read [RENDER_CHECKLIST.md](RENDER_CHECKLIST.md)
3. Sign up for MongoDB Atlas and Upstash

### ⏱️ If you have 30 minutes:
1. Set up MongoDB Atlas (10 min)
2. Set up Upstash (5 min)
3. Deploy on Render (10 min)
4. Test your app (5 min)

### ⏱️ For complete setup:
1. Follow [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) step-by-step
2. Review [RENDER_PRODUCTION.md](RENDER_PRODUCTION.md) for production setup
3. Monitor first 24 hours of deployment

## Key URLs

| Service | URL |
|---------|-----|
| **Render** | https://render.com/dashboard |
| **MongoDB Atlas** | https://cloud.mongodb.com |
| **Upstash** | https://console.upstash.com |
| **Your App** | https://your-app-name.onrender.com |

## Default Credentials

After deployment:
- **URL**: `https://your-app-name.onrender.com`
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Change these immediately in production!**

## Troubleshooting

### "Build failed"
→ Check Render logs. Usually: OOM (use Standard plan) or missing env var

### "Can't connect to database"
→ Check MongoDB URI is correct and IP is whitelisted

### "Login doesn't work"
→ Verify NEXTAUTH_URL matches your Render URL (https, no trailing slash)

### More help
→ See [RENDER_PRODUCTION.md](RENDER_PRODUCTION.md) "Troubleshooting" section

## Estimated Costs (Monthly)

| Service | Free | Paid |
|---------|------|------|
| Render | $0 | $7 (Standard) |
| MongoDB | $0 | $9 (M2 tier) |
| Upstash | $0 | $10 (Pro) |
| **Total** | **$0** | **~$26** |

Free tier is suitable for testing. Standard tier recommended for production.

## Architecture

```
GitHub (Your Code)
    ↓
Render (Auto-deploy on push)
    ├─ Next.js App (Node.js)
    ├─ Auto-restart & health checks
    └─ Auto-scale (optional on paid plans)
    
Connected to:
    ├─ MongoDB Atlas (Database)
    ├─ Upstash Redis (Cache)
    └─ External services (Twilio, etc.)
```

## Commands Reference

```bash
# Test build locally before deploying
npm run build
npm start

# Verify environment setup
npm run setup:validate

# Push to GitHub (triggers Render deploy)
git push origin main
```

## Important Notes

1. **Code is auto-deployed** when you push to `main` branch (if auto-deploy enabled in Render)
2. **Environment variables** must be added in Render Dashboard (not in .env.local)
3. **Secrets are NOT committed** to git (use Render's environment variables UI)
4. **MongoDB needs IP whitelist** (set to 0.0.0.0/0 for free tier, or use Render's IP in production)
5. **First build takes 5-10 minutes** (includes npm install, next build)

## Need Help?

1. **Deployment issues** → [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)
2. **Production setup** → [RENDER_PRODUCTION.md](RENDER_PRODUCTION.md)
3. **Quick reference** → [RENDER_CHECKLIST.md](RENDER_CHECKLIST.md)
4. **Environment help** → [env.render.example](env.render.example)

---

**Ready to deploy? Let's go! 🚀**

Start with [RENDER_CHECKLIST.md](RENDER_CHECKLIST.md) for the quickest path to production.
