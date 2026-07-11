import { AI_CONFIG } from "../config.js";

// Language detection using simple heuristics and common patterns
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  en: [/\b(the|is|are|was|were|have|has|can|could|would|should|will|do|does|did)\b/i],
  es: [/\b(el|la|los|las|es|son|está|están|tiene|tienen|puede|pueden|hacer|como|que)\b/i],
  fr: [/\b(le|la|les|des|est|sont|avoir|faire|comme|que|pour|dans|avec|une|bonjour)\b/i],
  de: [/\b(der|die|das|ist|sind|hat|haben|können|wie|was|für|mit|eine|guten|tag)\b/i],
  hi: [/\b(है|हैं|में|को|से|का|की|के|यह|वह|आप|मैं|तुम|नमस्ते|धन्यवाद)\b/],
  ar: [/\b(مرحبا|شكرا|نعم|لا|كيف|ماذا|لماذا|أين|من|إلى|هذا|هذه)\b/],
  pt: [/\b(o|a|os|as|é|são|tem|ter|fazer|como|que|para|com|uma|bom|dia)\b/i],
  zh: [/\b(你|好|是|的|了|在|有|我|他|她|这|那|什么|怎么|吗)\b/],
  ja: [/\b(は|が|を|に|で|も|の|と|から|まで|さん|です|ます|こんにちは|ありがとう)\b/],
};

export class LanguageDetector {
  detect(text: string): { language: string; confidence: number } {
    const scores: Record<string, number> = {};

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          score += 1;
        }
      }
      scores[lang] = score / patterns.length;
    }

    // Find the language with highest score
    let bestLang = AI_CONFIG.defaultLanguage;
    let bestScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    // If no pattern matched, return default with low confidence
    if (bestScore === 0) {
      return { language: AI_CONFIG.defaultLanguage, confidence: 0.3 };
    }

    return { language: bestLang, confidence: Math.min(bestScore, 1) };
  }
}
