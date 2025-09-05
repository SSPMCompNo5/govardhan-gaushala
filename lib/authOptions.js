import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { logAudit } from "./audit";
import "./nextauth-config"; // Validate NextAuth configuration

// Dummy bcrypt hash for timing-equalized compare when user is missing
// This is bcrypt hash for the string "invalidpassword" with cost 10
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8i1GQ2x8iN4u7C9u6r9v2m0F1G8f9K";

export const authOptions = {
  // Use JWT. We'll enforce custom short vs long sessions via token fields and middleware
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/" },
  // Add debug configuration for development
  debug: process.env.NODE_ENV === "development",
  // Ensure proper URL configuration
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      authorize: async (creds, req) => {
        const userId = String(creds?.userId || "").trim();
        const password = String(creds?.password || "");
        const remember = String(creds?.remember || "") === 'true' || creds?.remember === true;
        if (!userId || !password) return null;
        // Lazy-load mongo so that /api/auth/providers does not import ./mongo at module load
        const { default: clientPromise } = await import("./mongo");
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const userThrottle = db.collection('auth_throttle');
        const ipThrottle = db.collection('auth_ip_throttle');
        // Basic indexes (safe to call repeatedly)
        try {
          await userThrottle.createIndex({ userId: 1 });
          await ipThrottle.createIndex({ ip: 1 });
        } catch {}

        // Derive IP safely: prefer req.ip if available, otherwise parse XFF (last hop)
        let ip = req?.ip || null;
        try {
          const xff = (req?.headers?.get?.('x-forwarded-for') || req?.headers?.['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
          if (!ip && xff.length) ip = xff[xff.length - 1];
        } catch {}

        const now = Date.now();
        const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
        const LOCK_MS = 15 * 60 * 1000; // 15 minutes
        const MAX_ATTEMPTS_USER = 5;
        const MAX_ATTEMPTS_IP = 20;

        const [userRec, ipRec] = await Promise.all([
          userThrottle.findOne({ userId }),
          ip ? ipThrottle.findOne({ ip }) : Promise.resolve(null),
        ]);
        if ((userRec?.lockUntil && userRec.lockUntil > now) || (ipRec?.lockUntil && ipRec.lockUntil > now)) {
          throw new Error('Account temporarily locked due to multiple failed attempts');
        }

        const user = await db.collection("users").findOne({ userId });
        // Timing-safe compare: use dummy hash if user not found
        const ok = user
          ? await bcrypt.compare(password, user.passwordHash || "")
          : await bcrypt.compare(password, DUMMY_HASH);

        if (!ok || !user) {
          // Increment both user and IP counters uniformly to avoid enumeration
          const start = now - WINDOW_MS;
          const baseUser = userRec && userRec.windowStart && userRec.windowStart > start ? userRec : { failed: 0, windowStart: now };
          const nextUserFailed = (baseUser.failed || 0) + 1;
          const updateUser = { $set: { userId, ip, windowStart: baseUser.windowStart }, $setOnInsert: { createdAt: new Date() } };
          updateUser.$set.failed = nextUserFailed;
          updateUser.$set.lastFailAt = now;
          if (nextUserFailed >= MAX_ATTEMPTS_USER) {
            updateUser.$set.lockUntil = now + LOCK_MS;
          } else {
            updateUser.$unset = { lockUntil: "" };
          }

          const baseIp = ipRec && ipRec.windowStart && ipRec.windowStart > start ? ipRec : { failed: 0, windowStart: now };
          const nextIpFailed = (baseIp.failed || 0) + 1;
          const updateIp = { $set: { ip, windowStart: baseIp.windowStart }, $setOnInsert: { createdAt: new Date() } };
          updateIp.$set.failed = nextIpFailed;
          updateIp.$set.lastFailAt = now;
          if (nextIpFailed >= MAX_ATTEMPTS_IP) {
            updateIp.$set.lockUntil = now + LOCK_MS;
          } else {
            updateIp.$unset = { lockUntil: "" };
          }

          await Promise.all([
            userThrottle.updateOne({ userId }, updateUser, { upsert: true }),
            ip ? ipThrottle.updateOne({ ip }, updateIp, { upsert: true }) : Promise.resolve(),
          ]);
          return null;
        }

        // Success: reset throttle counters
        await Promise.all([
          userThrottle.updateOne(
            { userId },
            { $set: { failed: 0, windowStart: Date.now() }, $unset: { lockUntil: "", lastFailAt: "" } },
            { upsert: true }
          ),
          ip ? ipThrottle.updateOne(
            { ip },
            { $set: { failed: 0, windowStart: Date.now() }, $unset: { lockUntil: "", lastFailAt: "" } },
            { upsert: true }
          ) : Promise.resolve(),
        ]);

        return { id: String(user._id), userId: user.userId, role: user.role, remember };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.userId;
        token.role = user.role;
        token.remember = !!user.remember;
        token.loginAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      session.user.id = token.sub;
      session.user.userId = token.userId;
      session.user.role = token.role;
      session.user.remember = !!token.remember;
      session.user.loginAt = token.loginAt;
      return session;
    },
  },
  events: {
    // Best-effort audit on sign-in
    async signIn({ user, account, profile, isNewUser }) {
      try {
        await logAudit({
          actor: user?.userId || user?.id || null,
          action: 'auth:signIn',
          target: user?.userId || null,
          details: { provider: account?.provider || 'credentials', isNewUser: !!isNewUser },
        });
      } catch (e) {
        // ignore
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
};
