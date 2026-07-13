# ADR 003: Multi-Agent Orchestrator Pattern

**Status:** Accepted  
**Date:** 2026-07-13  
**Decision-makers:** Architecture Team  
**Tags:** ai, agents, orchestration

## Context

The original single-agent approach handled all tasks in a monolithic loop. This limited the system's ability to handle complex workflows, maintain quality, separate concerns, and manage long-running tasks. Complex requests produced poor results due to context window limits.

## Decision

Implement a multi-agent orchestrator with specialized agents:
1. **Planner Agent** - Decomposes goals into task graphs with ReAct, CoT, or ToT reasoning
2. **Executor Agent** - Executes individual tasks with tool calling
3. **Critic Agent** - Self-critiques and validates results
4. **Validator Agent** - Quality gates before final assembly
5. **Researcher Agent** - Deep search and information gathering
6. **Memory Agent** - Memory management, summarization, extraction
7. **Writer Agent** - Synthesizes final response from validated outputs

Each agent runs with its own system prompt, context, and tool scope.

## Consequences

**Positive:**
- Complex tasks broken into manageable pieces
- Quality improved through validation gates and self-critique
- Parallel execution of independent tasks reduces latency
- Clear separation of concerns

**Negative:**
- Increased token consumption (multiple LLM calls per request)
- Higher latency for simple requests (orchestrator overhead)
- More complex error handling and state management

**Neutral:**
- Orchestrator can fall back to single-agent mode for simple queries
- Reflection loop on plan quality adds another LLM call
