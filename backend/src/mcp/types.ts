export type MCPRole = "admin" | "manager" | "member";

export interface MCPAuthContext {
  userId: string;
  email: string;
  orgId: string;
  role: MCPRole;
  sessionId: string;
  requestTimestamp: number;
  signature: string;
}

export interface MCPContext {
  user: MCPAuthContext;
  org: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface MCPRequest {
  action: string;
  params: Record<string, unknown>;
  sessionId: string;
}

export interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  sessionId: string;
  requestId: string;
}

export interface MCPTool {
  name: string;
  description: string;
  requiredRole: MCPRole[];
  handler: (params: Record<string, unknown>, ctx: MCPContext) => Promise<unknown>;
}

export interface MCPAuditEntry {
  requestId: string;
  sessionId: string;
  userId: string;
  orgId: string;
  action: string;
  tool: string;
  params: Record<string, unknown>;
  result: string;
  ip?: string;
  timestamp: Date;
  durationMs: number;
}

export interface MCPMemoryEntry {
  sessionId: string;
  userId: string;
  orgId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface MCPSession {
  sessionId: string;
  userId: string;
  orgId: string;
  role: MCPRole;
  soulContent: string;
  context: {
    companyName: string;
    companyDescription: string;
    userName: string;
    userEmail: string;
  };
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}
