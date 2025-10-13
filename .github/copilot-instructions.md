# Copilot Instructions for Govardhan Goshala

## Project Overview
- Modern management system for cow shelters (goshala) using Next.js 15, React 19, MongoDB, Redis, and Docker.
- Multi-dashboard architecture: Admin, Watchman, Food Manager, Cow Manager, Doctor.
- Real-time updates, mobile responsiveness, role-based access control (RBAC).

## Architecture & Key Directories
- **app/**: Next.js app directory. Dashboards in `app/dashboard/*`, API routes in `app/api/*`.
- **lib/**: Utility libraries (DB, auth, security, helpers). MongoDB connection in `lib/mongo.js`, models in `lib/models/*`.
- **components/**: UI building blocks. Reusable elements in `components/ui/*`.
- **middleware.js**: Global route/API protection, role checks, security headers.
- **scripts/**: Setup and utility scripts.

## Data & Security Patterns
- **Authentication**: NextAuth.js with JWT. Passwords bcrypt-hashed. Session info in JWT.
- **Authorization**: RBAC via `lib/roles.js`. Use `canAccess(role, section)` for checks.
- **CSRF**: All mutations require `X-CSRF-Token` header (value from cookie).
- **Rate Limiting**: Write endpoints are rate limited; see `lib/rateLimit.js`.
- **Audit Logging**: Key actions are logged for traceability.

## Developer Workflows
- **Quick Start**: `npm run setup:friend` for full Docker setup. Manual: `npm install`, copy `env.friend.example` to `.env.local`, then `npm run docker:up`.
- **Access**: App runs at `http://localhost:3000`. Default login: `admin/admin123` (for demo).
- **Testing**: No dedicated test suite; use API endpoints and dashboards for manual validation.
- **Database Indexes**: Run `/api/admin/init-indexes` to create/refresh indexes.

## API & Integration
- All API routes under `/api/*` require JWT auth and role checks (except `/api/auth/*`).
- Mutations (POST/PATCH/DELETE) require CSRF token and JSON bodies.
- Rate limits and security enforced by middleware.
- External integrations: Twilio (SMS/WhatsApp), Redis (caching), MongoDB (data).

## UI & Component Patterns
- Use UI kit in `components/ui/*` for buttons, inputs, tables, cards, dialogs, badges.
- Pages and dashboards compose these for consistent UX.
- Optimistic UI updates and loading skeletons are standard.

## References & Docs
- See `/docs/OVERVIEW.md` for system story, `/docs/API.md` for endpoints, `/docs/SECURITY.md` for auth/RBAC, `/docs/DATABASE.md` for collections, `/docs/COMPONENTS.md` for UI kit, `/docs/FLOWS.md` for process walkthroughs.

---

**Example Patterns:**
- Protect API routes with middleware and role checks.
- Use `canAccess(role, section)` for RBAC.
- Always require CSRF token for mutations.
- Use UI kit components for all dashboard UIs.
- Run `npm run setup:friend` for full environment setup.

---

If any section is unclear or missing, please ask for feedback to improve these instructions.