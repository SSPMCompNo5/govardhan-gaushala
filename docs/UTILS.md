# Utilities & Config

## Authentication & Security
- `lib/authOptions.js`: Login/sign-in rules
- `middleware.js`: Route protection, security headers, role checks
- `lib/roles.js`: Who can access which section
- `lib/csrf.js`: Secret handshake for write actions
- `lib/rateLimit.js`: Limits how often actions can be performed; supports Redis/Upstash

## HTTP Helper
- `lib/http.js`: Central API caller
  - Adds headers
  - Redirects to sign-in if session expired

## Styling & Build
- `globals.css`: Global styles
- `postcss.config.mjs`, `next.config.mjs`: Build and CSS setup

## Offline Support
- `public/service-worker.js`: Helps keep some assets available when the network is weak
