export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface AgentMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  timestamp?: Date;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  role: "tool";
  content: string;
  name: string;
}

export interface IncomingMessage {
  text: string;
  userId: string;
  sessionId: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  text: string;
  data?: Record<string, unknown>;
  isFinal: boolean;
}
