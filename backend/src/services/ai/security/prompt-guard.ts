const INJECTION_PATTERNS = [
  // Direct system prompt override attempts
  /\b(system\s*prompt|ignore\s*(all\s*)?previous|ignore\s*instructions|forget\s*(everything|all)|new\s*instructions?)\b/i,
  /\b(you\s*are\s*(now|not)\s*(a|an|the)?\s*(free|different|human|assistant|chatbot|gpt|ai))\b/i,
  /\b(act\s*as\s*(if|though)|pretend\s*(to\s*be|that)|from\s*now\s*on\s*you\s*are)\b/i,
  /\b(repeat\s*(after|everything|all|this)|print\s*(the\s*)?(prompt|instructions|system))\b/i,
  /\b(do\s*(not|n't)\s*(follow|obey|listen|adhere)|disregard|override|cancel\s*previous)\b/i,
  /\b(output\s*(the\s*)?(prompt|system|instructions|initial|first\s*message))\b/i,

  // Jailbreak attempts
  /\b(DAN|jailbreak|developp?e?r\s*mode|god\s*mode|duck\s*mode|unfiltered|uncensored)\b/i,
  /\b(no\s*(filter|restriction|limit|boundary|censorship|rules|guidelines))\b/i,
  /\b(you\s*(can|will)\s*(say|do|write|generate)\s*anything)\b/i,
  /\b(bypass|circumvent|evade)\s*(filter|restriction|safety|content\s*policy)\b/i,

  // Data extraction attempts
  /\b(extract|leak|reveal|expose|dump)\s*(all|the|any)\s*(data|info|memory|context|history)\b/i,
  /\b(show|display|print|write)\s*(me\s*)?(the\s*)?(full|complete|entire|all)\s*(prompt|context)\b/i,
  /\b(what\s*(is|are)\s*(your|the)\s*(instructions|system|prompt|rules|guidelines))\b/i,
  /\b(tell\s*me\s*(the\s*)?(prompt|instructions|system|initial|first\s*message))\b/i,
  /\b(how\s*(are|do)\s*you\s*(work|operate|function|process|handle))\b/i,

  // Role-playing exploitations
  /\b(hypothetical|fictional|for\s*(science|research|educational)\s*purposes)\b.*\b(ignore|bypass|override)\b/i,
  /\b(this\s*is\s*(just\s*)?(a\s*)?(test|simulation|experiment|game|story))\b.*\b(pretend|act|ignore)\b/i,

  // Token smuggling / encoding-based attacks
  /\b(base64|hex\s*encode|decode|rot13|caesar|cipher|encrypt|obfuscate)\b.*\b(prompt|system|instruction)\b/i,

  // Multi-step manipulation
  /(step\s*1|first\s*step|begin|start)\b.*\b(ignore|forget|override|bypass)\b.*\b(rule|instruction|guideline|policy)\b/i,
  /\b(output\s*in\s*(english|french|spanish|german|hindi|arabic|chinese).*\b(but|however|yet)\b.*\b(ignore|forget))\b/is,

  // Delimiter/separator breaking
  /(---|===|\*\*\*|###|"""|'''|```).{0,10}(ignore|override|new\s*instruction|system\s*message)/is,
  /\b(sorry|apologize|unable|cannot|can't|won't)\b.*\b(but|however)\b.*\b(repeat|ignore|forget)\b/is,
];

const CONTENT_LEAK_PATTERNS = [
  /\b(API[_-]?KEY|api[_-]?key|secret|password|token|credential)\b.{0,50}["'`][A-Za-z0-9_\-.]{16,}/i,
  /\b(bearer|jwt|auth|session)\s+[A-Za-z0-9_\-.]{20,}/i,
  /\b[\\w.-]+@[\\w.-]+\\.\\w{2,}\b/, // Email (legitimate but could be PII leak)
  /\b\\d{16}\b/, // Credit card
  /\b\\d{3}-\\d{2}-\\d{4}\b/, // SSN
  /BEGIN\s+(RSA|DSA|EC|PGP|OPENSSH)\s+PRIVATE\s+KEY/, // Private keys
];

export interface GuardResult {
  isSafe: boolean;
  threats: ThreatInfo[];
  sanitizedText?: string;
}

export interface ThreatInfo {
  type: "prompt_injection" | "jailbreak" | "data_leak" | "role_play_exploit" | "encoding_attack" | "manipulation" | "pii_leak";
  severity: "low" | "medium" | "high" | "critical";
  pattern: string;
  match: string;
  suggestion: string;
}

export class PromptGuard {
  private threatPatterns: Array<{ pattern: RegExp; type: ThreatInfo["type"]; severity: ThreatInfo["severity"]; suggestion: string }>;

  constructor() {
    this.threatPatterns = INJECTION_PATTERNS.map((p) => ({
      pattern: p,
      type: "prompt_injection" as ThreatInfo["type"],
      severity: "critical" as ThreatInfo["severity"],
      suggestion: "Request appears to contain prompt injection attempt. Ignoring injected instructions.",
    }));
  }

  analyze(input: string, includeOutputGuard: boolean = false): GuardResult {
    const threats: ThreatInfo[] = [];

    for (const { pattern, type, severity, suggestion } of this.threatPatterns) {
      const match = input.match(pattern);
      if (match) {
        threats.push({
          type,
          severity,
          pattern: pattern.source.slice(0, 80),
          match: match[0].slice(0, 100),
          suggestion,
        });
      }
    }

    if (includeOutputGuard) {
      for (const pattern of CONTENT_LEAK_PATTERNS) {
        const match = input.match(pattern);
        if (match) {
          threats.push({
            type: "pii_leak",
            severity: "high",
            pattern: pattern.source.slice(0, 80),
            match: match[0].slice(0, 100),
            suggestion: "Output appears to contain sensitive information. Redacting.",
          });
        }
      }
    }

    return {
      isSafe: threats.length === 0,
      threats,
      sanitizedInput: threats.length > 0 ? this.sanitize(input, threats) : undefined,
    };
  }

  sanitize(input: string, threats?: ThreatInfo[]): string {
    const t = threats || this.analyze(input).threats;
    if (t.length === 0) return input;

    let sanitized = input;
    for (const threat of t) {
      if (threat.severity === "critical" || threat.severity === "high") {
        sanitized = sanitized.replace(threat.match, `[${threat.type} blocked]`);
      }
    }
    return sanitized;
  }

  getThreatSummary(threats: ThreatInfo[]): string {
    if (threats.length === 0) return "";
    const bySeverity = threats.reduce(
      (acc, t) => {
        acc[t.severity] = (acc[t.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return `Security: ${threats.length} threat(s) detected (${Object.entries(bySeverity).map(([k, v]) => `${v} ${k}`).join(", ")})`;
  }

  addCustomPattern(pattern: RegExp, type: ThreatInfo["type"], severity: ThreatInfo["severity"], suggestion: string): void {
    this.threatPatterns.push({ pattern, type, severity, suggestion });
  }
}

export const promptGuard = new PromptGuard();
