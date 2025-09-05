import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccess, roleHome } from "./lib/roles";

// Compression configuration
const COMPRESSION_THRESHOLD = 1024; // Only compress responses larger than 1KB
const COMPRESSIBLE_TYPES = [
  'text/html',
  'text/css',
  'text/plain',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/x-javascript',
  'application/xml',
  'application/vnd.api+json',
];

// Helper to check if response should be compressed
function shouldCompress(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType) return false;
  
  // Check if content type is compressible
  const isCompressible = COMPRESSIBLE_TYPES.some(type => contentType.includes(type));
  if (!isCompressible) return false;

  // Check content length
  const contentLength = parseInt(response.headers.get('content-length'));
  if (!contentLength || contentLength < COMPRESSION_THRESHOLD) return false;

  return true;
}

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET });
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isDev = process.env.NODE_ENV !== 'production';
  const CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'";

  // Allow auth, CSRF, and test routes to pass through
  if (pathname.startsWith("/api/auth") || pathname === "/api/csrf" || pathname === "/api/test-redis" || pathname === "/api/test-auth") {
    return NextResponse.next();
  }

  // Guard /dashboard and /api paths (except /api/auth)
  if (!token) {
    if (isApi) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // Security headers for APIs too
      res.headers.set('X-Frame-Options', 'DENY');
      res.headers.set('X-Content-Type-Options', 'nosniff');
      res.headers.set('Referrer-Policy', 'no-referrer');
      res.headers.set('Permissions-Policy', 'geolocation=()');
      if (!isDev) res.headers.set('Content-Security-Policy', CSP);
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    const next = encodeURIComponent(`${pathname}${search || ""}`);
    url.search = next ? `?next=${next}` : "";
    const res = NextResponse.redirect(url);
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'no-referrer');
    res.headers.set('Permissions-Policy', 'geolocation=()');
    if (!isDev) res.headers.set('Content-Security-Policy', CSP);
    return res;
  }

  // Short session for non-remembered logins
  try {
    const remember = !!(token.remember || (token.user && token.user.remember));
    const loginAt = Number(token.loginAt || 0);
    const now = Date.now();
    const SHORT_MS = 12 * 60 * 60 * 1000; // 12 hours
    if (!remember && loginAt && now - loginAt > SHORT_MS) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      const next = encodeURIComponent(`${pathname}${search || ""}`);
      url.search = next ? `?next=${next}` : "";
      return NextResponse.redirect(url);
    }
  } catch {}

  // Role-based routing and authorization for /dashboard and /api
  try {
    const role = token.user?.role || token.role;
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const dest = roleHome(role);
      const url = req.nextUrl.clone();
      url.pathname = dest;
      url.search = "";
      return NextResponse.redirect(url);
    }

    const match = pathname.match(/^\/dashboard\/([^\/]+)(?:\/|$)/);
    const section = match ? match[1] : null;
    if (section && !canAccess(role, section)) {
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // API RBAC
    if (isApi) {
      const apiMatch = pathname.match(/^\/api\/([^\/]+)(?:\/|$)/);
      const apiSection = apiMatch ? apiMatch[1] : null;
      const map = { food: "food-manager", "gate-logs": "watchman", admin: "admin", "goshala-manager": "goshala-manager", doctor: "doctor" };
      const sectionKey = map[apiSection] || apiSection;
      // Allow administrators to access all API sections
      if (sectionKey && !canAccess(role, sectionKey) && !(role === 'Owner/Admin' || role === 'Admin')) {
        const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
        res.headers.set('X-Frame-Options', 'DENY');
        res.headers.set('X-Content-Type-Options', 'nosniff');
        res.headers.set('Referrer-Policy', 'no-referrer');
        res.headers.set('Permissions-Policy', 'geolocation=()');
        if (!isDev) res.headers.set('Content-Security-Policy', CSP);
        return res;
      }
    }
  } catch {}

  const res = NextResponse.next();
  
  // Baseline security headers for all responses
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Permissions-Policy', 'geolocation=()');
  if (!isDev) res.headers.set('Content-Security-Policy', CSP);

  // Note: Compression is handled by Next.js automatically in production
  // Custom compression logic removed to avoid dependency issues

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
