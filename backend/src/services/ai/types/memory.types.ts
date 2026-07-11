import type { AgentMessage } from "./message.types.js";

export interface MemoryEntry {
  id: string;
  content: string;
  type: "fact" | "preference" | "context" | "learned";
  source: "agent" | "user" | "extracted";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
}

export interface ConversationSession {
  sessionId: string;
  userId: string;
  organizationId?: string;
  messages: AgentMessage[];
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface SessionMetadata {
  model: string;
  provider: string;
  turnCount: number;
  tokenCount: number;
  compressed: boolean;
  lastIntent?: string;
  tags: string[];
}

export interface UserProfile {
  userId: string;
  name?: string;
  email?: string;
  preferences: Record<string, unknown>;
  communicationStyle?: string;
  commonTopics: string[];
  interactionCount: number;
  lastInteractionAt: Date;
  createdAt: Date;
}

export interface MemoryQuery {
  userId: string;
  query: string;
  limit?: number;
  type?: MemoryEntry["type"];
  tags?: string[];
}
