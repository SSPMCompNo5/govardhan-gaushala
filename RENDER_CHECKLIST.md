# Render Deployment Checklist

Quick reference for deploying Govardhan Goshala to Render.

## Pre-Deployment (Do Once)

- [ ] **Push code to GitHub**
  ```bash
  git add .
  git commit -m "Ready for Render"
  git push origin main
  ```

- [ ] **Create MongoDB Atlas Account**
  - Go to https://www.mongodb.com/cloud/atlas
  - Create free M0 cluster
  - Create database user with strong password
  - Whitelist IP: `0.0.0.0/0` (for free tier)
  - Get connection string: `mongodb+srv://username:password@...`

- [ ] **Create Upstash Account**
  - Go to https://upstash.com
  - Create free Redis database
  - Copy REST URL and Token

- [ ] **Create Render Account**
  - Go to https://render.com
  - Connect your GitHub account

## Deployment Steps

1. **Generate Secrets**
   ```bash
   # Use this tool to generate random secrets
   # https://generate-secret.vercel.app/32
   ```
   - Generate 2 random 32-character strings
   - Save these for environment variables

2. **Create Web Service on Render**
   - Click **New +** → **Web Service**
   - Select GitHub repository
   - Select branch: `main`
   - Name: `goshala-app`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Free or Standard

3. **Add Environment Variables** (in Render Dashboard)
   
   ```
   NODE_ENV = production
   MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/goshala?retryWrites=true&w=majority
   MONGODB_DB = goshala
   NEXTAUTH_URL = https://your-app-name.onrender.com
   NEXTAUTH_SECRET = (your generated secret)
   JWT_SECRET = (your generated secret)
   UPSTASH_REDIS_REST_URL = (from Upstash)
   UPSTASH_REDIS_REST_TOKEN = (from Upstash)
   ```

4. **Deploy**
   - Click **Create Web Service**
   - Wait 5-10 minutes for build to complete
   - Check logs if errors occur

5. **Post-Deployment**
   - Copy your Render URL (e.g., `https://goshala-app.onrender.com`)
   - Update `NEXTAUTH_URL` with this URL
   - Trigger redeploy in Render settings

6. **Verify**
   - Visit your app URL
   - Log in with `admin` / `admin123`
   - Test core features

## Troubleshooting Commands

```bash
# View build logs
# → Render Dashboard → Logs

# Check database connection
curl https://your-app.onrender.com/api/health

# Trigger rebuild
# → Render Dashboard → Manual Deploy → Deploy latest commit
```

## Environment Variables Reference

| Name | Where to Get |
|------|-------------|
| `MONGODB_URI` | MongoDB Atlas → Connect → Connection String |
| `UPSTASH_REDIS_REST_URL` | Upstash Dashboard → Copy Details → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Dashboard → Copy Details → Token |
| `NEXTAUTH_SECRET` | Generate: https://generate-secret.vercel.app/32 |
| `JWT_SECRET` | Generate: https://generate-secret.vercel.app/32 |
| `NEXTAUTH_URL` | Your Render app URL (after deployment) |

## After Deployment

- [ ] Add custom domain (optional)
  - Render → Settings → Custom Domain
  - Update your domain's DNS

- [ ] Enable auto-deploy on git push (optional)
  - Render → Settings → Auto-Deploy

- [ ] Monitor logs and errors
  - Render Dashboard → Logs
  - Sentry (if configured)

- [ ] Upgrade plan if needed
  - Free tier: 512MB RAM (might be tight)
  - Standard: $7/month, 2GB RAM (recommended)

## Support & Resources

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas**: https://docs.mongodb.com/atlas/
- **Upstash**: https://docs.upstash.com/
- **Full Guide**: See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)

---

**Need help?** Check the logs in Render Dashboard or see [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed troubleshooting.
