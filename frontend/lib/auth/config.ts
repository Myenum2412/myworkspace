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
    };
  }
  interface User {
    role?: string;
    permissions?: string[];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.permissions = (user as { permissions?: string[] }).permissions;
        console.log(`[AUTH jwt] token updated: id=${user.id} role=${token.role}`);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        console.log(`[AUTH session] session built: email=${session.user.email} role=${session.user.role}`);
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

      if (!account || account.provider === "credentials" || !user.email) return true;

      try {
        const { db } = await import("@/lib/db");
        const existing = await db.collection("users").findOne({ email: user.email });
        if (!existing) {
          const { v4: uuid } = await import("uuid");
          const userId = uuid();
          const orgId = uuid();
          const userName = user.name || user.email.split("@")[0];

          await db.collection("users").insertOne({
            id: userId,
            name: userName,
            email: user.email,
            image: user.image || "",
            provider: account.provider,
            status: "online",
            role: "admin",
            emailVerified: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.collection("organizations").insertOne({
            id: orgId,
            name: `${userName}'s Organization`,
            slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`,
            plan: "starter",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.collection("org_members").insertOne({
            id: uuid(),
            orgId,
            userId,
            role: "admin",
            joinedAt: new Date(),
          });
        }
      } catch (err) {
        console.error("[AUTH] Failed to create OAuth user:", err);
      }

      return true;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      try {
        const { db } = await import("@/lib/db");
        await db.collection("users").updateOne(
          { id: user.id },
          { $set: { status: "online", updatedAt: new Date() } }
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;
        const { db } = await import("@/lib/db");
        const user = await db.collection("users").findOne({ email });
        if (!user) return null;
        if (!user.password) return null;
        const valid = await compare(password, user.password);
        if (!valid) return null;
        const userId = user.id || user._id?.toString();
        return { id: userId, email: user.email, name: user.name, image: user.image, role: user.role, permissions: user.permissions || [] };
      },
    }),
  ],
});
