import { v4 as uuidv4 } from "uuid";
import { MCPSession } from "../models/mcp-session.js";
import { User } from "../../lib/db/models/User.js";
import { Organization } from "../../lib/db/models/Organization.js";
import { Settings } from "../../lib/db/models/Settings.js";
import type { MCPAuthContext } from "../types.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export class MCPSessionManager {
  async createSession(auth: MCPAuthContext): Promise<{ sessionId: string; soulContent: string; context: Record<string, string> }> {
    const sessionId = uuidv4();

    const [user, org, settings] = await Promise.all([
      User.findOne({ id: auth.userId }).lean(),
      Organization.findOne({ id: auth.orgId }).lean(),
      Settings.findOne({ orgId: auth.orgId }).lean(),
    ]);

    const soulContent = "";

    const context = {
      companyName: org?.name || "",
      companyDescription: org?.companyDescription || "",
      userName: user?.name || auth.email,
      userEmail: auth.email,
    };

    await MCPSession.create({
      sessionId,
      userId: auth.userId,
      orgId: auth.orgId,
      role: auth.role,
      soulContent,
      context,
      isActive: true,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      lastActivityAt: new Date(),
    });

    return { sessionId, soulContent, context };
  }

  async getSession(sessionId: string): Promise<{
    session: import("../types.js").MCPSession;
    auth: MCPAuthContext;
  } | null> {
    const doc = await MCPSession.findOne({ sessionId, isActive: true }).lean();
    if (!doc) return null;
    if (doc.expiresAt < new Date()) {
      await MCPSession.updateOne({ sessionId }, { isActive: false });
      return null;
    }

    await MCPSession.updateOne({ sessionId }, { lastActivityAt: new Date() });

    const auth: MCPAuthContext = {
      userId: doc.userId,
      email: doc.context.userEmail,
      orgId: doc.orgId,
      role: doc.role,
      sessionId: doc.sessionId,
      requestTimestamp: Date.now(),
      signature: "",
    };

    return {
      session: {
        sessionId: doc.sessionId,
        userId: doc.userId,
        orgId: doc.orgId,
        role: doc.role,
        soulContent: doc.soulContent,
        context: doc.context,
        expiresAt: doc.expiresAt,
        createdAt: doc.createdAt,
        lastActivityAt: doc.lastActivityAt,
      },
      auth,
    };
  }

  async refreshSession(sessionId: string): Promise<void> {
    await MCPSession.updateOne(
      { sessionId },
      {
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      }
    );
  }

  async destroySession(sessionId: string): Promise<void> {
    await MCPSession.updateOne({ sessionId }, { isActive: false });
  }

  async updateSoulContent(sessionId: string, soulContent: string): Promise<void> {
    await MCPSession.updateOne({ sessionId }, { soulContent });
  }
}

export const mcpSessionManager = new MCPSessionManager();
