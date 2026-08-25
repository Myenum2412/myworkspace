import { setDefaultResultOrder } from "node:dns";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import { v4 as uuid } from "uuid";
import { ROLES } from "@/lib/rbac";

// Some hosts resolve Google's endpoints to an unreachable IPv6 address first,
// which makes the OAuth callback fetch time out (UND_ERR_CONNECT_TIMEOUT).
// Prefer IPv4 for all outbound connections from this server.
setDefaultResultOrder("ipv4first");

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
      role?: string;
      permissions?: string[];
      orgId?: string;
      onboardingCompleted?: boolean;
      tourCompleted?: boolean;
    };
  }
  interface User {
    role?: string;
    permissions?: string[];
    orgId?: string;
    onboardingCompleted?: boolean;
    tourCompleted?: boolean;
  }
}

async function autoProvisionOAuthUser(email: string, name?: string | null, image?: string | null) {
  const { db } = await import("@/lib/db");
  const { collections } = await import("@/lib/db/schema");
  const { getNextSequence } = await import("@/lib/db/counter");

  const userId = uuid();
  const orgId = uuid();
  const displayName = name?.trim() || email.split("@")[0];
  let slug =
    displayName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || `org-${userId}`;
  const existingSlug = await db.collection(collections.organizations).findOne({ slug });
  if (existingSlug) slug = `${slug}-${userId}`;

  const userNumber = await getNextSequence("userNumber");
  const now = new Date();

  await db.collection(collections.organizations).updateOne(
    { id: orgId },
    {
      $setOnInsert: {
        id: orgId,
        name: `${displayName}'s Organization`,
        slug,
        plan: "enterprise",
        ownerId: userId,
        createdBy: userId,
        subscriptionStatus: "active",
        trialEnd: null,
        currentPeriodEnd: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  await db.collection(collections.orgMembers).updateOne(
    { orgId, userId },
    {
      $setOnInsert: {
        orgId,
        userId,
        role: ROLES.MEMBERS,
        createdBy: userId,
        joinedAt: now,
      },
    },
    { upsert: true },
  );

  const userDoc = {
    id: userId,
    userNumber,
    name: displayName,
    email,
    emailVerified: true,
    orgId,
    image: image || null,
    status: "online",
    role: ROLES.MEMBERS,
    permissions: [],
    isActive: true,
    tokenVersion: 0,
    failedLoginAttempts: 0,
    createdBy: userId,
    lastLogin: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection(collections.users).insertOne(userDoc);
    return userDoc;
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      const existing = await db.collection(collections.users).findOne({ email });
      if (existing) return existing;
    }
    throw err;
  }
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/auth/not-found",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || ROLES.STAFFS;
        token.permissions = (user as { permissions?: string[] }).permissions;
        token.orgId = (user as { orgId?: string }).orgId;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted;
        token.tourCompleted = (user as { tourCompleted?: boolean }).tourCompleted;
        (token as any).tokenVersion = (user as { tokenVersion?: number }).tokenVersion || 0;
        (token as any).lastVerified = 0;
        return token;
      }

      if (token.id) {
        const now = Date.now();
        const lastVerified = (token as any).lastVerified as number | undefined;
        if (lastVerified && now - lastVerified < 900_000) {
          return token;
        }

        try {
          const { db } = await import("@/lib/db");
          const { collections } = await import("@/lib/db/schema");
          const userId = token.id as string;

          // Skip if database is not available
          if (!db) {
            (token as any).lastVerified = now;
            return token;
          }

          let dbUser: any = null;
          try {
            dbUser = await db.collection("users").findOne({ id: userId });
          } catch {
            // transient DB error → keep the session intact this round
            (token as any).lastVerified = 0;
            return token;
          }
          if (!dbUser) {
            try {
              dbUser = await db.collection(collections.clientUsers).findOne({ id: userId });
            } catch {
              (token as any).lastVerified = 0;
              return token;
            }
          }

          // Account no longer exists (deleted/removed) → sign out immediately.
          if (!dbUser) {
            return null;
          }

          // Terminated / deactivated / suspended accounts must be signed out
          // immediately, even with a still-valid JWT. Returning null from the
          // jwt callback invalidates the session (forces sign-out).
          if (dbUser?.isActive === false) {
            return null;
          }

          // A bumped tokenVersion means all sessions were revoked.
          const dbTokenVersion = dbUser?.tokenVersion ?? 0;
          const tokenTokenVersion = (token as any).tokenVersion ?? 0;
          if (dbTokenVersion > tokenTokenVersion) {
            return null;
          }

          const [org] = await Promise.all([
            token.orgId
              ? db
                  .collection("organizations")
                  .findOne({ id: token.orgId as string })
                  .catch(() => null)
              : Promise.resolve(null),
          ]);

          if (dbUser?.role && dbUser.role !== "USER" && token.role !== "client") {
            token.role = dbUser.role;
          }

          // Sync tokenVersion for backend revocation checks
          if (dbUser?.tokenVersion !== undefined) {
            (token as any).tokenVersion = dbUser.tokenVersion;
          }

          if (dbUser?.tourCompleted !== undefined) {
            token.tourCompleted = dbUser.tourCompleted === true;
          }

          if (!token.orgId && dbUser?.orgId) {
            token.orgId = dbUser.orgId;
          }

          if (org || (!token.orgId && dbUser)) {
            const resolvedOrgId = token.orgId || dbUser?.orgId || "";
            if (!org && resolvedOrgId) {
              const fetchedOrg = await db
                .collection("organizations")
                .findOne({ id: resolvedOrgId })
                .catch(() => null);
              if (fetchedOrg) {
                token.onboardingCompleted = fetchedOrg.onboardingCompleted === true;
                (token as any).plan = "enterprise";
                (token as any).subscriptionStatus = "active";
                (token as any).trialEnd = null;
                (token as any).currentPeriodEnd = null;
              } else {
                token.onboardingCompleted = true;
              }
            } else if (org) {
              token.onboardingCompleted = org.onboardingCompleted === true;
              (token as any).plan = "enterprise";
              (token as any).subscriptionStatus = "active";
              (token as any).trialEnd = null;
              (token as any).currentPeriodEnd = null;
            } else {
              token.onboardingCompleted = true;
            }
          } else {
            token.onboardingCompleted = true;
          }
        } catch {
          if (token.onboardingCompleted === undefined) {
            token.onboardingCompleted = true;
          }
        }

        (token as any).lastVerified = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.user.orgId = token.orgId as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.tourCompleted = token.tourCompleted as boolean;
        (session.user as any).plan = (token as any).plan as string;
        (session.user as any).subscriptionStatus = (token as any).subscriptionStatus as string;
        (session.user as any).trialEnd = (token as any).trialEnd as string | null;
        (session.user as any).currentPeriodEnd = (token as any).currentPeriodEnd as string | null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async signIn({ user, account }) {
      console.log(`[AUTH config] signIn event: email=${user?.email} provider=${account?.provider}`);

      if (!account || !user.email) return true;

      // Credentials provider is handled fully in `authorize` — no extra DB check needed here.
      if (account.provider === "credentials") return true;

      try {
        const { db } = await import("@/lib/db");

        // Skip if database is not available — allow credentials through but block OAuth
        if (!db) {
          console.warn("[AUTH] Database not available during OAuth sign-in");
          return false;
        }

        let existing = (await db.collection("users").findOne({ email: user.email })) as any;

        // OAuth auto-provisions an account (user + org + membership) on the
        // first sign-in with a new email, mirroring the backend signup flow.
        if (!existing) {
          console.log(`[AUTH] OAuth sign-in — auto-creating account for email: ${user.email}`);
          let created: Record<string, unknown> | null = null;
          try {
            created = await autoProvisionOAuthUser(user.email, user.name, user.image);
          } catch (err) {
            console.error("[AUTH] Failed to auto-provision OAuth account:", err);
          }
          // A concurrent sign-in may have created it meanwhile — re-check.
          const fallback = await db.collection("users").findOne({ email: user.email });
          existing = created ?? fallback;
          if (!existing) {
            return "/login?error=OAuthAccountNotFound";
          }
        }

        // Terminated / deactivated / suspended accounts cannot sign in.
        if (existing.isActive === false) {
          console.warn(`[AUTH] OAuth sign-in rejected — account deactivated: ${user.email}`);
          return false;
        }

        const uid = existing.id || existing._id?.toString();
        if (uid) user.id = uid;
        if (existing.orgId) (user as { orgId?: string }).orgId = existing.orgId;
        if (existing.role) (user as { role?: string }).role = existing.role;
        return true;
      } catch (err) {
        console.error("[AUTH] Failed to verify user in database:", err);
        return false;
      }
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      try {
        const { db } = await import("@/lib/db");
        await db
          .collection("users")
          .updateOne(
            { id: user.id },
            { $set: { status: "online", lastLogin: new Date(), updatedAt: new Date() } },
          );
      } catch {
        // MongoDB connection may not be available
      }
    },
    async signOut(data) {
      const userId = "token" in data ? (data.token?.sub as string) : undefined;
      if (!userId) return;
      try {
        const { db } = await import("@/lib/db");
        await db
          .collection("users")
          .updateOne({ id: userId }, { $set: { status: "offline", updatedAt: new Date() } });
      } catch {
        // MongoDB connection may not be available
      }
    },
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    LinkedIn({
      clientId: process.env.AUTH_LINKEDIN_ID!,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET!,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginSource: { label: "Login Source", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;

        const password = credentials?.password as string;
        if (!password) return null;

        try {
          const { db } = await import("@/lib/db");
          if (!db) return null;

          const { compare } = await import("bcryptjs");
          const { collections } = await import("@/lib/db/schema");

          let user = await db.collection(collections.users).findOne({ email: email.toLowerCase() });
          if (!user) {
            user = await db
              .collection(collections.clientUsers)
              .findOne({ email: email.toLowerCase() });
          }
          if (!user) return null;

          let valid = false;
          if (user.password) {
            valid = await compare(password, user.password);
          }
          if (!valid) return null;

          // Terminated / deactivated / suspended accounts cannot sign in.
          if (user.isActive === false) return null;
          if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) return null;

          const orgId = user.orgId || "";

          return {
            id: user.id || user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image || null,
            role: user.role || "members",
            permissions: user.permissions || [],
            orgId,
            onboardingCompleted: true,
            tourCompleted: user.tourCompleted !== undefined ? user.tourCompleted : true,
            tokenVersion: user.tokenVersion || 0,
          };
        } catch (e) {
          console.error("[AUTH authorize] Error:", e);
          return null;
        }
      },
    }),
  ],
});
