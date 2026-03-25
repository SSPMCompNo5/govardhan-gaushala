# Copilot Instructions for Govardhan Goshala

A comprehensive management system for cow shelters built with **Next.js 15, React 19, MongoDB, Redis, and Docker**. Multi-role dashboards (Admin, Watchman, Food Manager, Cow Manager, Doctor) with real-time updates, mobile responsiveness, and strict RBAC.

## System Architecture: "The Goshala Analogy"
- **Front Gate** (Watchman): Entry/exit logging via `/api/gate-logs`
- **Food Warehouse** (Food Manager): Inventory, feeding schedules, suppliers via `/api/food`
- **Admin Office** (Owner/Admin): System oversight, user management, health checks
- **Doctor & Cow Manager**: Medical records and cow profiles via respective dashboards
- **Security Layer**: JWT + NextAuth + CSRF + Rate Limiting + Audit logs

## Setup & Key Commands
```bash
npm run setup:friend        # One-command Docker setup + validation
npm run docker:up           # Start all services
npm run docker:logs         # View realtime logs
npm run setup:validate      # Pre-flight checks
```
- **App**: http://localhost:3000 (default: `admin/admin123`)
- **Mongo UI**: http://localhost:8081, **Redis UI**: http://localhost:8082
- Environment: Copy `env.friend.example` → `.env.local`; key vars: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

## Authorization & Role Hierarchy
**Pattern**: `canAccess(role, section)` in `lib/roles.js`
- `Owner/Admin`: All sections ('all')
- `Goshala Manager`: ['watchman', 'food-manager', 'cow-manager', 'doctor']
- `Watchman`: ['watchman']
- `Food Manager`: ['food-manager']
- `Cow Manager`: ['cow-manager']
- `Doctor`: ['doctor']

Protect endpoints: Check role in `middleware.js` → API namespace maps to section (e.g., `/api/food` → 'food-manager'). Use `roleHome(role)` to redirect after login.

## API Route Protection
All `/api/*` routes (except `/api/auth/*`, `/api/csrf`, `/api/test-*`, `/api/seed/*`) enforced by `middleware.js`:
1. **JWT Check**: Token from NextAuth cookie; `401` if missing/invalid
2. **Role Check**: `canAccess(role, apiNamespace)` → `403` if denied
3. **CSRF Check** (mutations only): POST/PATCH/DELETE require `X-CSRF-Token` header matching `csrftoken` cookie value
4. **Rate Limiting** (write endpoints): In-memory or Redis (Upstash); configurable per route. Defaults: 10-30 req/min.

**New API Pattern**:
```javascript
// app/api/food/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { validateCSRFFromRequest } from '@/lib/csrf';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!validateCSRFFromRequest(request)) return NextResponse.json({error: 'CSRF'}, {status: 403});
  await logAudit({actor: session.user.id, action: 'food:create', details: {...}});
  // ... logic
}
```

## Data Access: MongoDB + Indexes
- **Connection**: `lib/mongo.js` (pooled, TLS-aware for cloud)
- **Models**: `lib/models/foodInventory.js` (food data access layer)
- **Indexes**: `lib/initIndexes.js` auto-runs in dev; admin: `POST /api/admin/init-indexes`
- **Audit Trail**: `lib/audit.js` logs key actions (sign-in, CRUD) to `audit_logs` collection
- **Server-Only**: Modules with `import 'server-only'` (mongo, models) must not be imported by client code. Use `lib/foodConstants.js` for enums instead.

## Authentication: NextAuth + JWT
- **Provider**: Credentials (userId + password)
- **Storage**: Passwords bcrypt-hashed in `users` collection; JWT in HttpOnly cookie (no DB session store)
- **Payload**: `{userId, role, remember, loginAt}`
- **Throttling**: Failed logins lock user/IP via `auth_throttle` + `auth_ip_throttle` (TTL auto-cleanup)
- **Config**: `lib/authOptions.js` (NextAuth options); `lib/nextauth-config.js` (internal helpers)

## UI & Component Patterns
- **Kit**: `components/ui/*` (Radix + CVA): Button, Input, Table, Card, Dialog, Badge, Select, Checkbox, etc.
- **Layouts**: `components/layouts/*` (DashboardLayout, etc.) + `components/dashboard/*` (dashboard-specific components)
- **Mobile**: `components/mobile/*` (responsive adaptations)
- **Theme**: `theme-provider.jsx` (light/dark support); global styles in `app/globals.css`
- **Patterns**: Optimistic updates, loading skeletons, empty states, error boundaries. No dedicated test suite—validate manually via dashboards/API.

## Troubleshooting & Common Tasks
- **Database init**: `npm run setup:validate` checks prereqs; then `/api/admin/init-indexes` to ensure indexes
- **Logs**: `npm run docker:logs` (realtime), or check individual service logs
- **Port conflicts**: Stop other services on 3000 (app), 27017 (Mongo), 6379 (Redis), 8081 (Mongo UI), 8082 (Redis UI)
- **CSRF failures**: Verify `csrftoken` cookie + `X-CSRF-Token` header match; fetch from `/api/csrf` if needed
- **Rate limit exceeded**: Check `remaining` in response headers; limits reset per window in `lib/rateLimit.js`
- **Auth errors**: See `auth_throttle` collection; user may be temporarily locked. Check `NEXTAUTH_URL` (must match request origin)

## Key Files Reference
- **Auth & Security**: `middleware.js`, `lib/authOptions.js`, `lib/csrf.js`, `lib/rateLimit.js`, `lib/roles.js`, `lib/audit.js`
- **Data**: `lib/mongo.js`, `lib/models/foodInventory.js`, `lib/initIndexes.js`
- **Dashboards**: `app/dashboard/{admin,watchman,food-manager,cow-manager,doctor}/page.js`
- **APIs**: `app/api/{auth,food,gate-logs,doctor,...}/route.js`
- **Docs**: `/docs/OVERVIEW.md` (system story), `/docs/SECURITY.md` (auth/RBAC detail), `/docs/DATABASE.md` (collections), `/docs/API.md` (endpoints), `/docs/COMPONENTS.md` (UI kit)

---

When in doubt: Check existing API route pattern in `/app/api/`, verify role checks in `lib/roles.js`, and ensure CSRF token for mutations.