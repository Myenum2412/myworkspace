export type AgentId =
  | "aristotle" | "socrates" | "sun-tzu" | "ada" | "aurelius"
  | "machiavelli" | "lao-tzu" | "feynman" | "torvalds" | "musashi"
  | "watts" | "karpathy" | "sutskever" | "kahneman" | "meadows"
  | "munger" | "taleb" | "rams";

export type CouncilMode = "full" | "quick" | "duo";
export type CouncilRound = 1 | 2 | 3;
export type MemoryTier = "working" | "short-term" | "long-term" | "episodic" | "semantic";
export type EntityType = "user" | "project" | "task" | "file" | "client" | "team" | "organization" | "conversation" | "document";

export interface AgentProfile {
  id: AgentId;
  figure: string;
  domain: string;
  polarity: string;
  polarityPairs: string[];
  triads: string[];
  reasoningMethod: string;
  systemPrompt: string;
  modelAffinity?: string;
}

export interface CouncilConfig {
  mode: CouncilMode;
  members?: AgentId[];
  problem: string;
  context?: Record<string, unknown>;
  userId?: string;
  orgId?: string;
}

export interface CouncilRoundResponse {
  agentId: AgentId;
  content: string;
  confidence: number;
  round: CouncilRound;
  evidenceLabels?: string[];
  disagreements?: string[];
  strengthenedBy?: string[];
}

export interface CouncilVerdict {
  problem: string;
  summary: string;
  consensusLevel: "unanimous" | "majority" | "split" | "deadlocked";
  confidence: number;
  keyInsights: string[];
  disagreements: string[];
  recommendations: string[];
  dissentingOpinions: { agentId: AgentId; position: string }[];
  chairmanVerdict: string;
  executionTimeMs: number;
}

export interface MemoryEntry {
  id: string;
  orgId: string;
  userId?: string;
  tier: MemoryTier;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  importance: number;
  accessCount: number;
  lastAccessedAt: Date;
  createdAt: Date;
  ttl?: number;
}

export interface EntityNode {
  id: string;
  type: EntityType;
  name: string;
  orgId: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
}

export interface RelationshipEdge {
  id: string;
  sourceId: string;
  sourceType: EntityType;
  targetId: string;
  targetType: EntityType;
  relationship: string;
  strength: number;
  metadata: Record<string, unknown>;
  orgId: string;
  createdAt: Date;
}

export interface ChunkedDocument {
  id: string;
  documentId: string;
  orgId: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
    totalChunks: number;
    tokens: number;
  };
  createdAt: Date;
}

export interface SearchResult {
  chunkId: string;
  content: string;
  score: number;
  source: string;
  metadata: Record<string, unknown>;
  citations?: string[];
}

export interface ReasoningTrace {
  steps: ReasoningStep[];
  confidence: number;
  contradictions: Contradiction[];
  finalOutput: string;
}

export interface ReasoningStep {
  id: string;
  type: "premise" | "inference" | "deduction" | "hypothesis" | "verification" | "correction";
  content: string;
  confidence: number;
  evidence?: string[];
  parentStepId?: string;
}

export interface Contradiction {
  stepA: string;
  stepB: string;
  description: string;
  severity: "low" | "medium" | "high";
  resolution?: string;
}

export interface UserProfile {
  userId: string;
  orgId: string;
  expertise: string[];
  preferences: Record<string, unknown>;
  interactionPatterns: {
    preferredModel?: string;
    preferredResponseLength?: string;
    commonTopics: string[];
    activeHours: string[];
    averageSessionLength: number;
  };
  learnedContext: Record<string, unknown>;
  feedbackHistory: FeedbackEntry[];
  lastUpdated: Date;
}

export interface FeedbackEntry {
  messageId: string;
  rating: "like" | "dislike" | "neutral";
  category?: string;
  comment?: string;
  createdAt: Date;
}

export interface LRMQuery {
  userId: string;
  orgId: string;
  query: string;
  context?: {
    projectId?: string;
    taskId?: string;
    clientId?: string;
    fileIds?: string[];
    conversationId?: string;
  };
  options?: {
    useRag?: boolean;
    useCouncil?: boolean;
    useMemory?: boolean;
    stream?: boolean;
    model?: string;
    temperature?: number;
  };
}
