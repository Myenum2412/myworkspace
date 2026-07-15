import { AICompletionRequest, AICompletionResponse, AIStreamChunk } from "./types.js";

export interface IAIProvider {
  name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk>;
  validateConfig(): boolean;
}
