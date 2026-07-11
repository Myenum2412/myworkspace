import { AIProviderFactory } from "../providers/ai-provider.factory.js";
import type { AIMessage } from "../providers/ai-provider.interface.js";

export interface ExtractedEntities {
  productNames: string[];
  quantities: number[];
  dates: string[];
  times: string[];
  prices: number[];
  categories: string[];
  brands: string[];
  specifications: Record<string, string>;
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
  };
  appointmentDetails?: {
    date?: string;
    time?: string;
    purpose?: string;
    doctor?: string;
  };
  orderDetails?: {
    orderId?: string;
    status?: string;
  };
}

const ENTITY_PROMPT = `Extract all relevant entities from the user message. Return JSON with:

{
  "productNames": ["product name 1", "product name 2"],
  "quantities": [1, 2],
  "dates": ["2024-01-15", "tomorrow"],
  "times": ["10:00", "2:30 PM"],
  "prices": [50000, 100000],
  "categories": ["laptop", "mobile"],
  "brands": ["Apple", "Samsung"],
  "specifications": {"color": "black", "storage": "256GB"},
  "contactInfo": {"name": "John", "email": "john@example.com", "phone": "1234567890"},
  "appointmentDetails": {"date": "2024-01-15", "time": "10:00", "purpose": "checkup", "doctor": "Dr. Smith"},
  "orderDetails": {"orderId": "ORD123", "status": "pending"}
}

Only extract entities that are explicitly mentioned. Return empty arrays/objects for entities not found.
Respond with valid JSON only, no other text.`;

export class EntityExtractor {
  async extract(message: string, intent: string): Promise<ExtractedEntities> {
    try {
      const provider = AIProviderFactory.getProvider();

      if (!provider.isAvailable()) {
        return this.fallbackExtraction(message);
      }

      const messages: AIMessage[] = [
        {
          role: "system",
          content: `${ENTITY_PROMPT}\n\nDetected intent: ${intent}`,
        },
        { role: "user", content: message },
      ];

      const response = await provider.generateResponse(messages, {
        temperature: 0.2,
        maxTokens: 500,
      });

      const cleaned = response.content.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Entity extraction error:", error);
      return this.fallbackExtraction(message);
    }
  }

  private fallbackExtraction(message: string): ExtractedEntities {
    const lower = message.toLowerCase();

    // Extract quantities
    const quantityMatch = lower.match(/\b(\d+)\b/);
    const quantities = quantityMatch ? [parseInt(quantityMatch[1])] : [];

    // Extract prices
    const priceMatch = lower.match(/(?:rs|inr|₹|\$)\s*(\d+(?:,\d+)*)/i);
    const prices = priceMatch ? [parseInt(priceMatch[1].replace(/,/g, ""))] : [];

    // Extract phone numbers
    const phoneMatch = message.match(/\b(\d{10,12})\b/);
    const phone = phoneMatch ? phoneMatch[1] : undefined;

    // Extract email
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : undefined;

    return {
      productNames: [],
      quantities,
      dates: [],
      times: [],
      prices,
      categories: [],
      brands: [],
      specifications: {},
      contactInfo: { phone, email },
    };
  }
}
