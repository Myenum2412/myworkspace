import { Response, NextFunction } from "express";
import { authenticate } from "../../middleware/auth.js";
import { User } from "../../lib/db/models/User.js";
import { OrgMember } from "../../lib/db/models/OrgMember.js";
import type { AuthRequest } from "../../types/index.js";
import type { MCPAuthContext } from "../types.js";
import { AppError } from "../../middleware/error.js";

export interface MCPAuthenticatedRequest extends AuthRequest {
  mcpContext?: MCPAuthContext;
}

async function buildMCPContext(req: AuthRequest): Promise<MCPAuthContext> {
  if (!req.user?.userId || !req.user?.email) {
    throw new AppError(401, "MCP: Authentication required");
  }

  const orgId = req.user.orgId || await (async () => {
    const user = await User.findOne({ id: req.user!.userId }).lean();
    return user?.orgId;
  })();

  if (!orgId) {
    throw new AppError(403, "MCP: No organization associated with user");
  }

  const membership = await OrgMember.findOne({
    orgId,
    userId: req.user.userId,
  }).lean();

  if (!membership) {
    throw new AppError(403, "MCP: User is not a member of this organization");
  }

  return {
    userId: req.user.userId,
    email: req.user.email,
    orgId,
    role: membership.role as "admin" | "manager" | "member",
    sessionId: "",
    requestTimestamp: Date.now(),
    signature: "",
  };
}

export async function authenticateMCP(
  req: MCPAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const mcpContext = await buildMCPContext(req);
    req.mcpContext = mcpContext;
    if (!req.user) {
      req.user = {
        userId: mcpContext.userId,
        email: mcpContext.email,
        role: mcpContext.role,
        orgId: mcpContext.orgId,
      };
    }
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, "MCP: Authentication failed"));
  }
}
