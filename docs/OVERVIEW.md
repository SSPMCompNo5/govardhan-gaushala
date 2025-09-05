# Govardhan Goshala – Friendly Overview

This system helps a cow shelter manage daily life: the front gate, a food warehouse, and an admin office.

- Admin Office (Owner/Admin): Oversees everything and views reports.
- Front Gate (Watchman): Records who enters/exits.
- Food Warehouse (Food Manager): Manages stock, feeding logs, suppliers, and schedules.

## Story (Real-Life Analogy)
Think of a gated community with a warehouse inside and an owner watching over it.
- Gate logs = guard’s notebook
- Inventory = warehouse stock
- Feeding logs = feeding diary
- Suppliers = vendor contacts
- Schedules = calendar of feeding plans

## Security in Plain Language
- Login is the front desk issuing badges (secure tokens).
- Corridor guards check your badge before each area (middleware & roles).
- A secret handshake protects changes (CSRF token).
- A doorman prevents spam (rate limiting).
- Safety shields (security headers) protect the site.

## Where Things Live
- Dashboards: `app/dashboard/*`
- APIs: `app/api/*`
- Database access: `lib/mongo.js`, `lib/models/*`
- Security: `middleware.js`, `lib/authOptions.js`, `lib/roles.js`, `lib/csrf.js`, `lib/rateLimit.js`
- UI kit: `components/ui/*`
