# ADR 006: AI Testing Strategy

**Status:** Accepted  
**Date:** 2026-07-13  
**Decision-makers:** Architecture Team  
**Tags:** testing, ai, qa

## Context

The original AI code had no tests. Provider integrations, security filters, and memory operations needed validation. Testing AI systems is challenging due to non-deterministic LLM outputs, provider API dependencies, and complex agent interactions.

## Decision

Adopt a four-tier testing strategy:

1. **Unit Tests** (Jest) - Test individual components in isolation:
   - Provider dispatch logic (with mocked HTTP)
   - PromptGuard pattern matching
   - Memory manager operations
   - Tool registry and execution
   - Orchestrator task graph building
   
2. **Integration Tests** - Test components with real dependencies:
   - Document ingestion pipeline
   - Embedding service
   - Vector store CRUD
   - RabbitMQ message flow for AI jobs
   
3. **Security Tests** - Dedicated test suite for:
   - 30+ injection pattern variants
   - Edge cases (unicode, encoding, very long input)
   - False positive rate monitoring
   
4. **Load Tests** (k6) - AI-specific scenarios:
   - Concurrent chat requests
   - Tool execution throughput
   - Memory retrieval under load

## Consequences

**Positive:**
- 50+ test cases for core AI components
- Regression detection for security patterns
- Confidence in provider abstraction correctness
- CI pipeline gates on test pass

**Negative:**
- Integration tests need MongoDB/Redis services in CI
- Mock maintenance as providers update APIs
- Load tests require dedicated environment
