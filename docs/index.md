# MyWorkSpace Documentation Index

## Architecture
- `architecture.adoc` - Full system architecture, component diagrams, tech stack, flows

## Architecture Decisions (ADRs)
- `adr/001-multi-provider-llm-abstraction.md` - Multi-provider LLM abstraction
- `adr/002-enhanced-memory-with-rag.md` - Enhanced Memory System with RAG
- `adr/003-multi-agent-orchestrator.md` - Multi-Agent Orchestrator Pattern
- `adr/004-prompt-injection-defense.md` - Prompt Injection Defense Layer
- `adr/005-observability-and-monitoring.md` - AI Observability and Monitoring
- `adr/006-testing-strategy.md` - AI Testing Strategy

## AI Agent System
- `architecture.adoc` (see "AI Agent Architecture" section)
- `backend/src/services/ai/` - Source code (see inline docs)

## Operations
- `k8s/` - Kubernetes manifests (base + staging + production overlays)
- `docker-compose.yml` - Development Docker Compose
- `docker-compose.prod.yml` - Production Docker Compose overlay
- `scripts/` - DevOps and migration scripts

## Testing
- `backend/tests/unit/ai/` - Unit tests (providers, security, memory, agent, tools)
- `backend/tests/integration/ai/` - Integration tests
- `load-tests/load-test.js` - General load test suite
- `load-tests/ai-load-test.js` - AI-specific load test scenarios

## Configuration
- `.env.example` - Environment variable reference
- `backend/src/services/ai/config.ts` - AI configuration module
- `backend/src/services/ai/types/provider.types.ts` - Provider type definitions
