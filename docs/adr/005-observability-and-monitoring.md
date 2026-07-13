# ADR 005: AI Observability and Monitoring

**Status:** Accepted  
**Date:** 2026-07-13  
**Decision-makers:** Architecture Team  
**Tags:** observability, ai, monitoring

## Context

The original system had minimal observability for AI operations. There was no tracking of token usage, provider costs, latency per model, tool invocation rates, or memory utilization. Debugging AI behavior required log spelunking.

## Decision

Implement comprehensive observability:

1. **AI-Specific Logging** - Structured JSON logging with correlation IDs, agent ID, provider used, model, token count, latency, and tool calls
2. **Cost Tracking** - Per-provider cost calculation at ModelRouter level, aggregated by org and user
3. **Performance Metrics** (Prometheus):
   - `ai_requests_total` (counter, by provider)
   - `ai_latency_seconds` (histogram, by provider/model)
   - `ai_token_usage_total` (counter, by provider/type)
   - `ai_cost_total` (counter, by provider)
   - `ai_tool_calls_total` (counter, by tool name)
   - `ai_memory_size` (gauge)
   - `ai_prompt_guard_blocked` (counter, by threat level)
4. **Health Probes** - `/api/health` checks provider connectivity, vector store status
5. **Correlation** - `x-request-id` propagated through all layers

## Consequences

**Positive:**
- Real-time cost visibility and budget control
- Performance bottleneck identification
- Security incident detection (spike of prompt guard blocks)
- Capacity planning from usage trends

**Negative:**
- Metric storage costs (mitigated by aggregation intervals)
- Overhead of label cardinality (mitigated by bounded label sets)
