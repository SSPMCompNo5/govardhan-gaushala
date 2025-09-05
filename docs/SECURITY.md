# Security Overview

This document describes how authentication, authorization, and API protection work in this project.

## Authentication (NextAuth + JWT)
- Provider: Credentials (userId + password)
- Passwords: bcrypt-hashed in the `users` collection
- Session: JWT (no DB session storage)
- Token payload includes: `userId`, `role`, `remember`, `loginAt`
- Short session for non-remembered logins enforced by middleware

Environment variables:
- `NEXTAUTH_SECRET` (or fallback `JWT_SECRET`)
- `NEXTAUTH_URL`
- `MONGODB_URI`, `MONGODB_DB`

## Throttling and Lockouts
- Collections: `auth_throttle` and `auth_ip_throttle`
- Locks user/IP temporarily after repeated failures
- TTL indexes automatically expire stale throttle documents

## Authorization (RBAC)
Defined in `lib/roles.js`:
- role → home route mapping
- `canAccess(role, section)` returns boolean

Default access matrix:
- `Owner/Admin`: ['admin', 'watchman']
- `Watchman`: ['watchman']
- `Food Manager`: ['food-manager']

Adjust by editing `lib/roles.js`.

## Global API Protection (Middleware)
Middleware (`middleware.js`) secures both app pages and API routes:
- Applies to `/dashboard/:path*` and `/api/:path*`
- Allows `/api/auth/*` (NextAuth internal routes)
- All other `/api/*` require a valid JWT or return `401` JSON
- Role checks per API namespace; returns `403` JSON on forbidden

### Rate Limiting
- In-memory rate limiter in `lib/rateLimit.js`
- Applied to write endpoints (POST/PATCH/DELETE) for inventory, feeding-logs, suppliers, schedule
- Defaults:
  - Inventory: POST 10/min, PATCH/DELETE 20/min
  - Feeding Logs: POST 15/min, PATCH/DELETE 30/min
  - Suppliers: POST 10/min, PATCH/DELETE 20/min
  - Schedule: POST 5/min, PATCH/DELETE 10/min
- For production, consider a distributed store (Redis/Upstash)

API namespace → section mapping used for RBAC:
- `/api/food` → `food-manager`
- `/api/gate-logs` → `watchman`
- `/api/admin` → `admin`

To add new protected APIs:
1) Create the route under `/app/api/<namespace>/route.js`
2) Map `<namespace>` to a section in `middleware.js`
3) If needed, update `canAccess` in `lib/roles.js`

## Server-only Boundaries
To prevent client bundles from including the MongoDB driver:
- `lib/mongo.js` and `lib/models/foodInventory.js` import `server-only`
- Client code must not import server modules. For enums/constants, use `lib/foodConstants.js`

If you see browser errors like "Can't resolve 'child_process'", a client import is pulling a server module. Replace it with constants or fetch data via API.

## CSRF Protection
- For API routes protected by JWT and same-site cookies, CSRF risk is reduced. If needed:
  - Enable NextAuth CSRF for form-based actions, or
  - Add a custom CSRF token header check on POST/PATCH/DELETE (e.g., `X-CSRF-Token`),
  - Only accept JSON and reject `application/x-www-form-urlencoded`/`text/plain`.
- UI forms can include a CSRF token fetched from an API endpoint and sent in a header.

## Indexes and Performance
- `lib/initIndexes.js` defines and initializes indexes (runs automatically in dev)
- Admin endpoint: `POST /api/admin/init-indexes` (requires Admin role)
- Queries use parallel `countDocuments` + `find` via `Promise.all`
- Mongo connection pooling tuned in `lib/mongo.js`

## Secrets & Configuration
- Do not hardcode credentials in code
- Configure via `.env.local` (dev) or platform-managed environment variables
- Minimum required: `MONGODB_URI`, `MONGODB_DB`, `NEXTAUTH_SECRET` (or `JWT_SECRET`), `NEXTAUTH_URL`

## Auditing
- Key actions (e.g., sign-in, CRUD) are recorded via `lib/audit.js` where implemented

## Production Recommendations
- Set `NEXTAUTH_URL` to your public HTTPS URL
- Use strong, rotated `NEXTAUTH_SECRET`
- Lock down network access to MongoDB
- Enable TLS for DB connections where appropriate (`MONGODB_TLS=true`)
- Monitor auth throttle collections and audit logs

## Health Checks
- `/api/health` pings the database and returns 200 JSON when healthy (503 otherwise)
