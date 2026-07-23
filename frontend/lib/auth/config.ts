import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import GitHub from "next-auth/providers/github";
import { ROLES } from "@/lib/rbac";

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
    };
  }
  interface User {
    role?: string;
    permissions?: string[];
    orgId?: string;
    onboardingCompleted?: boolean;
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
        (token as any).lastVerified = 0;
        return token;
      }

      if (token.id) {
        const now = Date.now();
        const lastVerified = (token as any).lastVerified as number | undefined;
        if (lastVerified && (now - lastVerified) < 900_000) {
          return token;
        }

        try {
          const { db } = await import("@/lib/db");
          const userId = token.id as string;

          // Skip if database is not available
          if (!db) {
            (token as any).lastVerified = now;
            return token;
          }

          const [dbUser, org] = await Promise.all([
            db.collection("users").findOne({ id: userId }).catch(() => null),
            token.orgId
              ? db.collection("organizations").findOne({ id: token.orgId as string }).catch(() => null)
              : Promise.resolve(null),
          ]);

          if (dbUser?.role && dbUser.role !== "USER" && token.role !== "client") {
            token.role = dbUser.role;
          }

          // Sync tokenVersion for backend revocation checks
          if (dbUser?.tokenVersion !== undefined) {
            (token as any).tokenVersion = dbUser.tokenVersion;
          }

          if (!token.orgId && dbUser?.orgId) {
            token.orgId = dbUser.orgId;
          }

          if (org || (!token.orgId && dbUser)) {
            const resolvedOrgId = token.orgId || dbUser?.orgId || "";
            if (!org && resolvedOrgId) {
              const fetchedOrg = await db.collection("organizations").findOne({ id: resolvedOrgId }).catch(() => null);
              if (fetchedOrg) {
                token.onboardingCompleted = fetchedOrg.onboardingCompleted === true;
                (token as any).plan = fetchedOrg.plan || "trial";
                (token as any).subscriptionStatus = fetchedOrg.subscriptionStatus || "trialing";
                (token as any).trialEnd = fetchedOrg.trialEnd?.toISOString() || (fetchedOrg.createdAt ? new Date(new Date(fetchedOrg.createdAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : null);
                (token as any).currentPeriodEnd = fetchedOrg.currentPeriodEnd?.toISOString() || null;
              } else {
                token.onboardingCompleted = true;
              }
            } else if (org) {
              token.onboardingCompleted = org.onboardingCompleted === true;
              (token as any).plan = org.plan || "trial";
              (token as any).subscriptionStatus = org.subscriptionStatus || "trialing";
              (token as any).trialEnd = org.trialEnd?.toISOString() || (org.createdAt ? new Date(new Date(org.createdAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : null);
              (token as any).currentPeriodEnd = org.currentPeriodEnd?.toISOString() || null;
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

      try {
        const { db } = await import("@/lib/db");

        // Skip if database is not available
        if (!db) {
          console.warn("[AUTH] Database not available, skipping sign-in processing");
          return true;
        }

        const { v4: uuid } = await import("uuid");
        const existing = await db.collection("users").findOne({ email: user.email });

        if (!existing) {
          const userId = uuid();
          const now = new Date();
          const userName = user.name || user.email.split("@")[0];
          const { getNextSequence } = await import("@/lib/db/counter");
          const newOrgId = uuid();
          const userNumber = await getNextSequence("userNumber");
          let slug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId}`;

          const slugCheck = await db.collection("organizations").findOne({ slug });
          if (slugCheck) slug = `${slug}-${userId}`;

          const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

          // Parallelize all three writes
          await Promise.all([
            db.collection("users").insertOne({
              id: userId, userNumber, email: user.email, name: userName,
              image: user.image || null, provider: account.provider,
              providerAccountId: account.providerAccountId,
              orgId: newOrgId, role: ROLES.MEMBERS,
              status: "online", lastLogin: now, createdAt: now, updatedAt: now,
            }),
            db.collection("organizations").insertOne({
              id: newOrgId, name: `${userName}'s Organization`, slug,
              plan: "trial", trialEnd, subscriptionStatus: "trialing",
              ownerId: userId, onboardingCompleted: true, createdAt: now, updatedAt: now,
            }),
              db.collection("org_members").insertOne({
                id: uuid(), orgId: newOrgId, userId, role: ROLES.MEMBERS, joinedAt: now,
            }),
          ]);

          user.id = userId;
          (user as { orgId?: string }).orgId = newOrgId;
          (user as { role?: string }).role = ROLES.MEMBERS;
          return true;
        }

        const uid = existing.id || existing._id?.toString();
        if (uid) user.id = uid;
        if (existing.orgId) (user as { orgId?: string }).orgId = existing.orgId;
        if (existing.role) (user as { role?: string }).role = existing.role;
        return true;
      } catch (err) {
        console.error("[AUTH] Failed to check/create user in database:", err);
        return false;
      }
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      try {
        const { db } = await import("@/lib/db");
        await db.collection("users").updateOne(
          { id: user.id },
          { $set: { status: "online", lastLogin: new Date(), updatedAt: new Date() } }
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
        await db.collection("users").updateOne(
          { id: userId },
          { $set: { status: "offline", updatedAt: new Date() } }
        );
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

        const apiUrl = process.env.API_URL || "http://localhost:4000";
        const loginSource = credentials?.loginSource as string | undefined;
        const endpoint = loginSource === "client" ? "/api/client-auth/login" : "/api/auth/login";

        try {
          const res = await fetch(`${apiUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();

          if (!data.success || !data.data) {
            return null;
          }

          const userData = data.data.user;
          return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            image: userData.image,
            role: userData.role,
            permissions: userData.permissions || [],
            orgId: data.data.orgId || userData.orgId,
            onboardingCompleted: true,
          };
        } catch (e) {
          console.error("[AUTH authorize] Backend API error:", e);
          return null;
        }
      },
    }),
  ],
});
