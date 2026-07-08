import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import GitHub from "next-auth/providers/github";
import { compare } from "bcryptjs";

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
        token.role = (user as { role?: string }).role || "workspace";
        token.permissions = (user as { permissions?: string[] }).permissions;
        token.orgId = (user as { orgId?: string }).orgId;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted;
        token.lastVerified = Date.now();
        return token;
      }

      // Only re-verify from DB every 5 minutes
      if (token.id) {
        const now = Date.now();
        const lastVerified = (token as any).lastVerified as number | undefined;
        if (lastVerified && (now - lastVerified) < 300_000) {
          return token;
        }

        try {
          const { db } = await import("@/lib/db");
          const dbUser = await db.collection("users").findOne({ id: token.id });
          if (dbUser?.role && dbUser.role !== "USER" && token.role !== "client") {
            token.role = dbUser.role;
          } else if (!token.role || token.role === "USER") {
            token.role = "workspace";
          }
          const orgId = token.orgId as string | undefined;
          if (orgId) {
            const org = await db.collection("organizations").findOne({ id: orgId });
            token.onboardingCompleted = org?.onboardingCompleted === true;
            (token as any).plan = org?.plan || "trial";
            (token as any).subscriptionStatus = org?.subscriptionStatus || "trialing";
            (token as any).trialEnd = org?.trialEnd?.toISOString() || null;
            (token as any).currentPeriodEnd = org?.currentPeriodEnd?.toISOString() || null;
          } else {
            const member = await db.collection("org_members").findOne({ userId: token.id });
            if (member) {
              token.orgId = member.orgId?.toString() || "";
              const org = await db.collection("organizations").findOne({ id: member.orgId });
              token.onboardingCompleted = org?.onboardingCompleted === true;
              (token as any).plan = org?.plan || "trial";
              (token as any).subscriptionStatus = org?.subscriptionStatus || "trialing";
              (token as any).trialEnd = org?.trialEnd?.toISOString() || null;
              (token as any).currentPeriodEnd = org?.currentPeriodEnd?.toISOString() || null;
            } else {
              token.onboardingCompleted = true;
            }
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
        const { v4: uuid } = await import("uuid");
        const existing = await db.collection("users").findOne({ email: user.email });

        if (!existing) {
          // Auto-create user from OAuth provider
          console.log(`[AUTH config] Auto-creating user for ${user.email} from ${account.provider}`);
          const userId = uuid();
          const now = new Date();
          const userName = user.name || user.email.split("@")[0];
          const { getNextSequence } = await import("@/lib/db/counter");

          let userNumber: number;
          let retries = 0;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            userNumber = await getNextSequence("userNumber");
            try {
              await db.collection("users").insertOne({
                id: userId,
                userNumber,
                email: user.email,
                name: userName,
                image: user.image || null,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                role: "workspace",
                status: "online",
                lastLogin: now,
                createdAt: now,
                updatedAt: now,
              });
              break;
            } catch (insertErr: unknown) {
              const mongoErr = insertErr as { code?: number };
              if (mongoErr.code === 11000 && retries < 5) {
                retries++;
                continue;
              }
              throw insertErr;
            }
          }

          // Auto-create organization for the user
          const newOrgId = uuid();
          let slug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId}`;
          const existingSlug = await db.collection("organizations").findOne({ slug });
          if (existingSlug) {
            slug = `${slug}-${userId}`;
          }

          const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
          await db.collection("organizations").insertOne({
            id: newOrgId,
            name: `${userName}'s Organization`,
            slug,
            plan: "trial",
            trialEnd,
            subscriptionStatus: "trialing",
            ownerId: userId,
            onboardingCompleted: true,
            createdAt: now,
            updatedAt: now,
          });

          // Add user as admin of the organization
          await db.collection("org_members").insertOne({
            id: uuid(),
            orgId: newOrgId,
            userId,
            role: "admin",
            joinedAt: now,
          });

          console.log(`[AUTH config] Auto-created user ${userId} and org ${newOrgId} for ${user.email}`);
          // Update user object with id for the token
          user.id = userId;
          (user as { orgId?: string }).orgId = newOrgId;
          (user as { role?: string }).role = "workspace";
          return true;
        }

        // Existing user - allow sign in
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
        twoFactorToken: { label: "2FA Token", type: "text" },
        loginSource: { label: "Login Source", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;

        const twoFactorToken = credentials?.twoFactorToken as string | undefined;
        if (twoFactorToken) {
          const apiUrl = process.env.API_URL || "http://localhost:4000";
          const res = await fetch(`${apiUrl}/api/two-factor/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, token: twoFactorToken }),
          });
          const data = await res.json();
          if (!data.success || !data.data) return null;
          const userData = data.data.user;
          return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            image: userData.image,
            role: userData.role,
            permissions: userData.permissions || [],
            orgId: data.data.orgId,
          };
        }

        const password = credentials?.password as string;
        if (!password) return null;

        const loginSource = credentials?.loginSource as string | undefined;

        const { db } = await import("@/lib/db");
        console.log("[AUTH authorize] looking up", email);

        // Client-source login: check client_users ONLY — ensures "client" role
        if (loginSource === "client") {
          const cu = await db.collection("client_users").findOne({ email });
          if (cu && cu.password && cu.isActive) {
            const valid = await compare(password, cu.password);
            if (valid) {
              return {
                id: cu.id || cu._id?.toString(),
                email: cu.email,
                name: cu.name,
                role: "client",
                permissions: [],
                orgId: cu.orgId,
                onboardingCompleted: true,
              };
            }
          }
          return null;
        }

        // Staff / default login: check users first, then client_users as fallback
        const user = await db.collection("users").findOne({ email });
        if (user && user.password) {
          const valid = await compare(password, user.password);
          console.log("[AUTH authorize] password valid:", valid);
          if (valid) {
            const userId = user.id || user._id?.toString();
            const memberDoc = await db.collection("org_members").findOne({ userId });
            const orgId = memberDoc?.orgId?.toString() || "";
            let onboardingCompleted = true;
            if (orgId) {
              const org = await db.collection("organizations").findOne({ id: orgId });
              onboardingCompleted = org?.onboardingCompleted === true;
            }
            return { id: userId, email: user.email, name: user.name, image: user.image, role: user.role, permissions: user.permissions || [], orgId, onboardingCompleted };
          }
        }

        const clientUser = await db.collection("client_users").findOne({ email });
        if (clientUser && clientUser.password && clientUser.isActive) {
          const valid = await compare(password, clientUser.password);
          if (valid) {
            return {
              id: clientUser.id || clientUser._id?.toString(),
              email: clientUser.email,
              name: clientUser.name,
              role: "client",
              permissions: [],
              orgId: clientUser.orgId,
              onboardingCompleted: true,
            };
          }
        }

        return null;
      },
    }),
  ],
});
