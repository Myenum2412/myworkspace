# ADR 001: Multi-Provider LLM Abstraction

**Status:** Accepted  
**Date:** 2026-07-13  
**Decision-makers:** Architecture Team  
**Tags:** ai, providers, architecture

## Context

The original AI system used a single provider (OpenRouter) hardcoded through the codebase. This created vendor lock-in, single point of failure, and inability to route requests by cost, latency, or capability.

## Decision

Implement a provider abstraction layer with:
1. Unified `AIProvider` interface with `chat()`, `streamChat()`, `generateTools()`, `embed()` methods
2. Provider registry pattern where each provider registers itself with capabilities
3. Model router that selects providers based on strategy (auto, cost, latency, capability)
4. Fallback chain: if primary provider fails, cascade to next capable provider

## Consequences

**Positive:**
- 8 providers supported (OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Perplexity, Ollama)
- Automatic failover improves reliability
- Cost-optimized routing reduces operational costs
- Easy to add new providers

**Negative:**
- Slightly more complex configuration
- Need to maintain API compatibility across providers

**Neutral:**
- Provider-specific features (vision, tools, streaming) must be capability-tested at runtime
