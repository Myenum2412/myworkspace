# ADR 004: Prompt Injection Defense Layer

**Status:** Accepted  
**Date:** 2026-07-13  
**Decision-makers:** Architecture Team  
**Tags:** ai, security

## Context

The AI agent accepts user input which is embedded into system prompts. Without defenses, malicious users could inject instructions that override the system prompt, extract sensitive information, jailbreak the model, or execute dangerous operations through the tool system.

## Decision

Implement a multi-layer defense:

1. **PromptGuard** - Pre-processing layer that scans user input for 30+ attack patterns:
   - System prompt override attempts (e.g., "Ignore all previous instructions")
   - DAN/jailbreak patterns
   - Instruction extraction (e.g., "Output your system prompt")
   - Role-play manipulations
   - Encoding/token smuggling
   - Delimiter breaking
   
2. **Dangerous Operation Approval** - Tool execution layer that flags destructive actions:
   - File deletion (rm -rf)
   - Database mutations (DROP TABLE, DELETE without WHERE)
   - Permission changes (chmod 777)
   - Command injection patterns
   
3. **Output Validation** - Post-processing that screens for leaked secrets, system prompts in output, or PII exposure

## Consequences

**Positive:**
- Dramatically reduced risk of prompt injection attacks
- Tool approval prevents accidental destructive operations
- Audit trails for all blocked attempts
- Flexible threat level system (low/medium/high/critical)

**Negative:**
- False positives may block legitimate inputs
- Additional latency in request processing (~5-15ms)
- Pattern list must be maintained as new attack vectors emerge
