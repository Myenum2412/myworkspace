import { AI_CONFIG } from "../config.js";
import { AIProviderFactory } from "../providers/ai-provider.factory.js";
import type { AIMessage } from "../providers/ai-provider.interface.js";

export type IntentType =
  | "product_inquiry"
  | "price_check"
  | "stock_availability"
  | "appointment_booking"
  | "order_status"
  | "customer_support"
  | "service_inquiry"
  | "business_info"
  | "faq"
  | "lead_collection"
  | "contact_request"
  | "complaint"
  | "feedback"
  | "general_conversation"
  | "unknown";

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities: Record<string, any>;
  requiresDatabase: boolean;
  requiresExternalApi: boolean;
  suggestedModule: string | null;
}

const INTENT_PROMPT = `You are an intent detection system. Analyze the user message and determine the intent.

Available intents:
- product_inquiry: Customer asking about products, features, specifications
- price_check: Customer asking about pricing, costs, deals
- stock_availability: Customer asking about stock, availability, inventory
- appointment_booking: Customer wants to book an appointment
- order_status: Customer checking order status, delivery
- customer_support: Customer needs help, has issues
- service_inquiry: Customer asking about services offered
- business_info: Customer asking about business hours, location, contact
- faq: Common questions about policies, returns, shipping
- lead_collection: Customer expressing interest, wanting to be contacted
- contact_request: Customer wants contact information
- complaint: Customer has a complaint
- feedback: Customer giving feedback
- general_conversation: Casual chat, greetings, thank you
- unknown: Cannot determine intent

Respond in JSON format:
{
  "intent": "intent_type",
  "confidence": 0.0-1.0,
  "entities": {"key": "value"},
  "requiresDatabase": true/false,
  "requiresExternalApi": true/false,
  "suggestedModule": "module_name or null"
}

Only respond with valid JSON, no other text.`;

export class IntentDetector {
  async detect(message: string, conversationHistory: string[]): Promise<IntentResult> {
    try {
      const provider = AIProviderFactory.getProvider();

      if (!provider.isAvailable()) {
        return this.fallbackDetection(message);
      }

      const messages: AIMessage[] = [
        { role: "system", content: INTENT_PROMPT },
        ...conversationHistory.slice(-5).map((msg) => ({
          role: "user" as const,
          content: msg,
        })),
        { role: "user", content: message },
      ];

      const response = await provider.generateResponse(messages, {
        temperature: 0.3,
        maxTokens: 200,
      });

      // Parse JSON response
      const cleaned = response.content.replace(/```json\n?|\n?```/g, "").trim();
      const result = JSON.parse(cleaned);

      return {
        intent: result.intent || "unknown",
        confidence: result.confidence || 0.5,
        entities: result.entities || {},
        requiresDatabase: result.requiresDatabase || false,
        requiresExternalApi: result.requiresExternalApi || false,
        suggestedModule: result.suggestedModule || null,
      };
    } catch (error) {
      console.error("Intent detection error:", error);
      return this.fallbackDetection(message);
    }
  }

  private fallbackDetection(message: string): IntentResult {
    const lower = message.toLowerCase();

    // Simple keyword-based fallback
    const patterns: Record<IntentType, RegExp[]> = {
      product_inquiry: [/\b(product|item|laptop|phone|mobile|camera|headphone)\b/i],
      price_check: [/\b(price|cost|how much|rate|budget|cheap|expensive)\b/i],
      stock_availability: [/\b(stock|available|availability|in stock|out of stock)\b/i],
      appointment_booking: [/\b(book|appointment|schedule|visit|consultation)\b/i],
      order_status: [/\b(order|delivery|shipping|track|status)\b/i],
      customer_support: [/\b(help|support|issue|problem|error|not working)\b/i],
      service_inquiry: [/\b(service|offer|provide|do you)\b/i],
      business_info: [/\b(hour|location|address|contact|phone|email)\b/i],
      faq: [/\b(return|refund|exchange|policy|warranty)\b/i],
      lead_collection: [/\b(interested|contact me|call me|reach out)\b/i],
      contact_request: [/\b(contact|number|email|reach|call)\b/i],
      complaint: [/\b(complaint|bad|terrible|worst|unsatisfied)\b/i],
      feedback: [/\b(feedback|suggestion|improve|great|excellent)\b/i],
      general_conversation: [/\b(hi|hello|hey|thanks|thank you|bye)\b/i],
      unknown: [],
    };

    for (const [intent, regexes] of Object.entries(patterns)) {
      for (const regex of regexes) {
        if (regex.test(lower)) {
          return {
            intent: intent as IntentType,
            confidence: 0.6,
            entities: {},
            requiresDatabase: ["product_inquiry", "price_check", "stock_availability", "order_status"].includes(intent),
            requiresExternalApi: false,
            suggestedModule: null,
          };
        }
      }
    }

    return {
      intent: "general_conversation",
      confidence: 0.4,
      entities: {},
      requiresDatabase: false,
      requiresExternalApi: false,
      suggestedModule: null,
    };
  }
}
