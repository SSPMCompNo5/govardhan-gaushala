# Production Deployment Guide for Render

Essential information for running Govardhan Goshala in production on Render.

## Architecture on Render

```
┌────────────────────────────────────────────────────┐
│              Render (us-east region)               │
├────────────────────────────────────────────────────┤
│  Web Service: goshala-app                          │
│  ├─ Node.js runtime                               │
│  ├─ Next.js 15 (standalone mode)                  │
│  ├─ Auto-restart on failure                       │
│  └─ Auto-deploy on git push (optional)            │
└────────────────────────┬───────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    MongoDB Atlas   Upstash Redis    External Services
    (Database)      (Cache Layer)     (Twilio, etc.)
```

## Performance Optimization

### Memory & CPU Management
- **Free Plan**: 512MB RAM (may cause OOM on builds)
- **Standard Plan**: 2GB RAM, 0.5 CPU (recommended minimum)
- **Pro Plan**: 4GB RAM, 2 CPU (for high traffic)

Monitor usage in Render Dashboard → Metrics tab.

### Database Performance

**MongoDB Atlas**:
- Enable **Compression** in MongoDB settings
- Use **Connection Pooling** (AppServices)
- Create indexes (automatically done in `/api/admin/init-indexes`)
- Monitor performance in Atlas Dashboard → Performance Advisor

**Query optimization tips**:
```javascript
// Good: Use indexed fields
db.collection('food_inventory').findOne({ category: 'hay', available: true })

// Avoid: Complex $regex without index
db.collection('food_inventory').find({ name: /.*hay.*/ })
```

### Redis Caching

Upstash free tier:
- 10,000 commands per day
- Monitor in Upstash Dashboard → Metrics
- Consider paid plan if hitting limits

**Cache hit rate**: Aim for >60% on frequently accessed data.

## Security Best Practices

### Environment Variables
- Never commit `.env.local` to git
- Use Render's **Environment Variables** UI
- Rotate secrets monthly (`NEXTAUTH_SECRET`, `JWT_SECRET`)
- Use strong passwords (>20 chars) for MongoDB

### Database Security

**MongoDB Atlas**:
1. Network Access → Whitelist only Render IPs
   - Render public IP: varies, safer to use `0.0.0.0/0` for free tier
   - Production: Get Render's specific IP and whitelist only that
2. Database Users → Create strong password (no reuse)
3. Backup → Enable automated backups (free tier: weekly)

**Connection String**:
```
✓ mongodb+srv://username:strong_password@...
✗ mongodb+srv://admin:admin@...
```

### Middleware Security
- CSRF protection: Enabled (X-CSRF-Token header)
- Security headers: X-Frame-Options, X-Content-Type-Options
- HTTPS enforced (Render auto-provides SSL)

## Monitoring & Logging

### Render Logs
```bash
# Real-time logs
Render Dashboard → Your Service → Logs tab

# Search for errors
- "Error" or "error" in logs
- "Unhandled" for exceptions
- "timeout" for connection issues
```

### Application Health Check
```bash
# Test database connection
curl https://your-app.onrender.com/api/health

# Expected response:
# { "status": "ok", "database": "connected" }
```

### Sentry Integration (Optional)
Already installed in package.json. To enable:
1. Create Sentry account: https://sentry.io
2. Add to Render environment:
   ```
   SENTRY_DSN = https://key@sentry.io/project
   SENTRY_ENVIRONMENT = production
   ```

## Scaling & Load Testing

### Expected Load
- Concurrent users: 50-100 on Standard plan
- Peak requests/sec: 10-20 on Standard plan

For higher load:
1. Upgrade to **Pro plan** ($100/month)
2. Consider **Render Load Balancer**
3. Add **read replicas** to MongoDB

### Load Testing
```bash
# Using Apache Bench (ab)
ab -n 100 -c 10 https://your-app.onrender.com

# Using wrk
wrk -t4 -c100 -d30s https://your-app.onrender.com
```

## Backup & Disaster Recovery

### Database Backups

**MongoDB Atlas**:
- Automatic backups: Every 6 hours (free tier)
- Retention: 7 days free, 35 days paid
- Manual backup: Atlas → Backup → Trigger backup

**Download backup**:
```bash
# Use MongoDB tools
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/goshala" --out ./backup
```

### Redis Backups
- Upstash: Automatic daily snapshots
- Enable in Upstash → Redis Database → Backup

### Application Backups
- GitHub: Your code is auto-backed up
- Enable GitHub → Settings → Backup (if available)

## Troubleshooting Production Issues

### Build Fails: "JavaScript heap out of memory"
**Solution**: Use **Standard plan** instead of Free
```bash
# Check build logs
Render Dashboard → Logs → Search "heap"
```

### App Crashes: "Connection refused"
**Causes**:
1. MongoDB URI invalid
2. Upstash token expired
3. IP not whitelisted in MongoDB

**Fix**:
```bash
# Verify environment variables
curl https://your-app.onrender.com/api/test-env

# Check database connection
curl https://your-app.onrender.com/api/health

# Redeploy
Render → Manual Deploy → Deploy latest commit
```

### Slow Response Times
**Solutions**:
1. Check Redis cache hit rate (Upstash Dashboard)
2. Enable MongoDB connection pooling
3. Upgrade to Standard plan
4. Check Render metrics for CPU/memory usage

### CORS or CSRF Errors
**Cause**: `NEXTAUTH_URL` mismatch

**Fix**:
```
1. Get your Render URL: https://your-service-name.onrender.com
2. Update NEXTAUTH_URL environment variable
3. Trigger redeploy
```

## Routine Maintenance

### Daily
- Check logs for errors: `Render Dashboard → Logs`
- Monitor uptime: `Render Dashboard → Metrics`

### Weekly
- Review MongoDB query performance
- Check Redis cache hit rate
- Monitor error trends in Sentry

### Monthly
- Rotate `NEXTAUTH_SECRET` and `JWT_SECRET`
- Review and update dependencies: `npm update`
- Clean up old database entries (optional)

## Custom Domain Setup

1. **Register domain**: GoDaddy, Namecheap, etc.
2. **Add to Render**:
   - Service Settings → Custom Domain
   - Add domain (e.g., `goshala.example.com`)
   - Render provides DNS records
3. **Update DNS**: Point domain to Render nameservers
4. **SSL Certificate**: Auto-generated by Render (free)

## Cost Estimation

| Service | Free Tier | Standard | Notes |
| --- | --- | --- | --- |
| **Render** | $0 | $7/mo | 512MB → 2GB RAM |
| **MongoDB Atlas** | $0 | $9/mo | 512MB → 2GB storage |
| **Upstash** | $0 | $10/mo | 10k cmds → unlimited |
| **Domain** | - | $12/yr | GoDaddy, Namecheap |
| **Total** | $0/mo | ~$28/mo | Minimal production setup |

## Getting Help

- **Render**: https://render.com/docs/troubleshooting
- **MongoDB**: https://docs.mongodb.com/manual/
- **Upstash**: https://docs.upstash.com/
- **Next.js**: https://nextjs.org/docs

---

**Happy deploying! 🚀 Your Goshala is production-ready.**
