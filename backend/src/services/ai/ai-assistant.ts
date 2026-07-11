import { AI_CONFIG, BUSINESS_CONFIG } from "./config.js";
import { AIProviderFactory } from "./providers/ai-provider.factory.js";
import type { AIMessage } from "./providers/ai-provider.interface.js";
import { LanguageDetector } from "./intent/language-detector.js";
import { IntentDetector, type IntentResult } from "./intent/intent-detector.js";
import { EntityExtractor, type ExtractedEntities } from "./entities/entity-extractor.js";
import { ConversationMemory, type ConversationMessage } from "./memory/conversation-memory.js";
import { ProductWorkflow } from "./workflows/product-workflow.js";
import { logger } from "../../lib/logger/index.js";

export interface AIRequest {
  customerPhone: string;
  message: string;
  customerName?: string;
}

export interface AIResponse {
  reply: string;
  intent: IntentResult;
  entities: ExtractedEntities;
  language: string;
  confidence: number;
  processingTimeMs: number;
  databaseOperations: string[];
}

export class AIAssistant {
  private languageDetector: LanguageDetector;
  private intentDetector: IntentDetector;
  private entityExtractor: EntityExtractor;
  private conversationMemory: ConversationMemory;
  private productWorkflow: ProductWorkflow;

  constructor() {
    this.languageDetector = new LanguageDetector();
    this.intentDetector = new IntentDetector();
    this.entityExtractor = new EntityExtractor();
    this.conversationMemory = new ConversationMemory();
    this.productWorkflow = new ProductWorkflow();
  }

  async processMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const databaseOperations: string[] = [];

    try {
      // 1. Detect language
      const languageResult = this.languageDetector.detect(request.message);
      logger.info({ phone: request.customerPhone, language: languageResult.language }, "Language detected");

      // 2. Get conversation history
      const history = this.conversationMemory.getConversationHistory(request.customerPhone);
      const context = this.conversationMemory.getContext(request.customerPhone);

      // 3. Detect intent
      const intentResult = await this.intentDetector.detect(request.message, history);
      logger.info({ phone: request.customerPhone, intent: intentResult.intent, confidence: intentResult.confidence }, "Intent detected");

      // 4. Extract entities
      const entities = await this.entityExtractor.extract(request.message, intentResult.intent);
      logger.info({ phone: request.customerPhone, entities }, "Entities extracted");

      // 5. Save user message to memory
      await this.conversationMemory.addMessage(request.customerPhone, {
        role: "user",
        content: request.message,
        timestamp: new Date(),
        intent: intentResult.intent,
        entities,
      });

      // 6. Process based on intent
      let reply = "";
      switch (intentResult.intent) {
        case "product_inquiry":
          reply = await this.productWorkflow.handleProductInquiry(request.message, entities, languageResult.language);
          databaseOperations.push("product_search");
          break;

        case "price_check":
          reply = await this.productWorkflow.handlePriceCheck(entities, languageResult.language);
          databaseOperations.push("price_lookup");
          break;

        case "stock_availability":
          reply = await this.productWorkflow.handleStockCheck(entities, languageResult.language);
          databaseOperations.push("stock_check");
          break;

        case "general_conversation":
          reply = await this.handleGeneralConversation(request.message, history, context);
          break;

        default:
          reply = await this.handleDefaultIntent(request.message, intentResult, history, context);
          break;
      }

      // 7. Save assistant response to memory
      await this.conversationMemory.addMessage(request.customerPhone, {
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      });

      // 8. Update context with extracted entities
      await this.conversationMemory.updateContext(request.customerPhone, {
        lastIntent: intentResult.intent,
        lastEntities: entities,
        customerName: request.customerName,
      });

      const processingTimeMs = Date.now() - startTime;

      return {
        reply,
        intent: intentResult,
        entities,
        language: languageResult.language,
        confidence: intentResult.confidence,
        processingTimeMs,
        databaseOperations,
      };
    } catch (error) {
      logger.error({ error, phone: request.customerPhone }, "AI processing error");
      return {
        reply: "I apologize, but I encountered an error processing your request. Please try again or contact our support team.",
        intent: { intent: "unknown", confidence: 0, entities: {}, requiresDatabase: false, requiresExternalApi: false, suggestedModule: null },
        entities: {} as ExtractedEntities,
        language: "en",
        confidence: 0,
        processingTimeMs: Date.now() - startTime,
        databaseOperations,
      };
    }
  }

  private async handleGeneralConversation(
    message: string,
    history: string[],
    context: Record<string, any>
  ): Promise<string> {
    const provider = AIProviderFactory.getProvider();

    if (!provider.isAvailable()) {
      return this.getFallbackResponse(message);
    }

    const systemPrompt = `You are a helpful customer service assistant for ${BUSINESS_CONFIG.name}.
    
Rules:
- Be friendly, professional, and concise
- Stay focused on helping with products, services, and appointments
- If the customer asks about products, suggest they can browse our catalog
- If they need help, offer to connect them with support
- Never make up information about products or prices
- Keep responses under 3-4 sentences unless more detail is needed
- If greeting, introduce yourself and ask how you can help
- If thanking, acknowledge and ask if there's anything else`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((msg) => ({
        role: msg.startsWith("user:") ? "user" as const : "assistant" as const,
        content: msg.replace(/^(user|assistant): /, ""),
      })),
      { role: "user", content: message },
    ];

    try {
      const response = await provider.generateResponse(messages, {
        temperature: 0.7,
        maxTokens: 200,
      });
      return response.content;
    } catch {
      return this.getFallbackResponse(message);
    }
  }

  private async handleDefaultIntent(
    message: string,
    intent: IntentResult,
    history: string[],
    context: Record<string, any>
  ): Promise<string> {
    const provider = AIProviderFactory.getProvider();

    if (!provider.isAvailable()) {
      return "I understand you need help. Could you please provide more details so I can assist you better?";
    }

    const systemPrompt = `You are a customer service assistant for ${BUSINESS_CONFIG.name}.
    
The customer's message has been analyzed and the detected intent is: ${intent.intent}
Confidence: ${intent.confidence}

Based on this intent, provide a helpful response. If the intent is unclear, ask clarifying questions.
Stay focused on what the customer is asking. Do not introduce unrelated topics.`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4).map((msg) => ({
        role: msg.startsWith("user:") ? "user" as const : "assistant" as const,
        content: msg.replace(/^(user|assistant): /, ""),
      })),
      { role: "user", content: message },
    ];

    try {
      const response = await provider.generateResponse(messages, {
        temperature: 0.7,
        maxTokens: 300,
      });
      return response.content;
    } catch {
      return "I understand your request. Let me help you with that. Could you provide a bit more detail?";
    }
  }

  private getFallbackResponse(message: string): string {
    const lower = message.toLowerCase();

    if (lower.match(/^(hi|hello|hey|good morning|good evening)/)) {
      return `Hello! Welcome to ${BUSINESS_CONFIG.name}. How can I help you today?`;
    }

    if (lower.match(/thank|thanks/)) {
      return "You're welcome! Is there anything else I can help you with?";
    }

    if (lower.match(/bye|goodbye|see you/)) {
      return "Goodbye! Have a great day!";
    }

    return `Thank you for reaching out to ${BUSINESS_CONFIG.name}. I can help you with:
• Product inquiries and pricing
• Stock availability
• Appointment booking
• General support

How can I assist you?`;
  }
}
