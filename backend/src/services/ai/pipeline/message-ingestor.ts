import type { IncomingMessage, AgentMessage } from "../types/message.types.js";
import { LanguageDetector } from "../intent/language-detector.js";
import { IntentDetector } from "../intent/intent-detector.js";
import { EntityExtractor } from "../entities/entity-extractor.js";
import type { IntentResult } from "../intent/intent-detector.js";
import type { ExtractedEntities } from "../entities/entity-extractor.js";
import { logger } from "../../../lib/logger/index.js";

export interface IngestedMessage {
  normalizedText: string;
  language: string;
  languageConfidence: number;
  intent: IntentResult;
  entities: ExtractedEntities;
  metadata: Record<string, unknown>;
}

export class MessageIngestor {
  private languageDetector: LanguageDetector;
  private intentDetector: IntentDetector;
  private entityExtractor: EntityExtractor;

  constructor() {
    this.languageDetector = new LanguageDetector();
    this.intentDetector = new IntentDetector();
    this.entityExtractor = new EntityExtractor();
  }

  async ingest(raw: IncomingMessage, history: AgentMessage[]): Promise<IngestedMessage> {
    const startTime = Date.now();

    const normalizedText = this.normalize(raw.text);

    const languageResult = this.languageDetector.detect(normalizedText);
    logger.debug({ userId: raw.userId, language: languageResult.language }, "Language detected");

    const historyStrings = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-5)
      .map((m) => `${m.role}: ${m.content}`);

    const intent = await this.intentDetector.detect(normalizedText, historyStrings);
    logger.debug({ userId: raw.userId, intent: intent.intent, confidence: intent.confidence }, "Intent detected");

    const entities = await this.entityExtractor.extract(normalizedText, intent.intent);
    logger.debug({ userId: raw.userId, entities }, "Entities extracted");

    const duration = Date.now() - startTime;
    logger.debug({ userId: raw.userId, durationMs: duration }, "Message ingestion complete");

    return {
      normalizedText,
      language: languageResult.language,
      languageConfidence: languageResult.confidence,
      intent,
      entities,
      metadata: {
        processingTimeMs: duration,
        rawLength: raw.text.length,
        normalizedLength: normalizedText.length,
        ...raw.metadata,
      },
    };
  }

  private normalize(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, "\"")
      .replace(/[\u2013\u2014]/g, "-");
  }
}
