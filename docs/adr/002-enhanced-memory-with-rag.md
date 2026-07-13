# ADR 002: Enhanced Memory System with RAG

**Status:** Accepted  
**Date:** 2026-07-13  
**Decision-makers:** Architecture Team  
**Tags:** ai, memory, rag

## Context

The original memory system was a flat array of messages with no structured recall, no long-term retention, and no semantic search. The agent could not remember facts across sessions, retrieve relevant past context by meaning, or maintain working memory for complex tasks.

## Decision

Replace flat memory with a three-tier architecture:
1. **Working Memory** - In-memory Map with LRU eviction, scored by importance. Used for active session context.
2. **Episodic Memory** - Stored in vector DB + MongoDB, 30-day TTL. Records conversation episodes with timestamps and importance scores.
3. **Semantic Memory** - Stored in vector DB, 90-day TTL. Extracts and stores facts, preferences, and knowledge by entity.

All three tiers feed into a context assembler that builds the system prompt with relevant memories, recent events, and entity relationships.

## Consequences

**Positive:**
- Agent can recall facts from previous conversations
- Semantic search retrieves relevant context by meaning, not just keyword
- Importance scoring prunes low-value memories automatically
- RAG pipeline enables document ingestion and hybrid (vector + keyword) retrieval

**Negative:**
- Vector DB dependency requires additional infrastructure
- Embedding generation adds latency to memory writes
- Increased memory storage costs

**Neutral:**
- Users may be surprised when the agent "remembers" older conversations
- Privacy implications of persistent memory storage
