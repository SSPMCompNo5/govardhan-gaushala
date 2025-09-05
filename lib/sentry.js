let sentry = null;

export function initSentry() {
  const dsn = process.env.SENTRY_DSN || '';
  if (!dsn) return false;
  try {
    // Lazy import to avoid bundling if not configured
    const Sentry = require('@sentry/nextjs');
    Sentry.init({ dsn, tracesSampleRate: 0.2 });
    sentry = Sentry;
    return true;
  } catch {
    return false;
  }
}

export function captureError(err, context = {}) {
  try {
    if (sentry) {
      sentry.captureException(err, { extra: context });
    } else {
      console.error('Error:', err?.message || err, context);
    }
  } catch {}
}


