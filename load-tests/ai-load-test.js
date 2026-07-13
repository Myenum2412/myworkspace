import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("ai_errors");
const latency = new Trend("ai_latency");
const tokenLatency = new Trend("ai_token_latency");

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

export const options = {
  scenarios: {
    agent_chat: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 0 },
      ],
      exec: "agentChat",
    },
    agent_tools: {
      executor: "per-vu-iterations",
      vus: 10,
      iterations: 50,
      maxDuration: "2m",
      exec: "agentToolCall",
    },
    agent_memory: {
      executor: "constant-vus",
      vus: 5,
      duration: "1m",
      exec: "agentMemory",
    },
  },
  thresholds: {
    ai_errors: ["rate<0.10"],
    ai_latency: ["p(95)<15000"],
  },
};

function getHeaders() {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "X-Organization-Id": "test-org",
    },
  };
}

export function agentChat() {
  const payload = JSON.stringify({
    message: "What are my top 3 tasks due this week?",
    sessionId: `load-test-${__VU}-${__ITER}`,
  });

  const res = http.post(`${BASE_URL}/api/ai/agent/chat`, payload, getHeaders());
  check(res, {
    "chat responded": (r) => r.status === 200,
    "has response": (r) => r.json("response") !== undefined,
  });
  errorRate.add(res.status !== 200);
  latency.add(res.timings.duration);

  sleep(Math.random() * 2 + 1);
}

export function agentToolCall() {
  const payload = JSON.stringify({
    message: "Find my recent tasks from project 'Sprint 24' assigned to me",
    sessionId: `tool-test-${__VU}`,
  });

  const res = http.post(`${BASE_URL}/api/ai/agent/chat`, payload, getHeaders());
  check(res, {
    "tool call responded": (r) => r.status === 200,
  });
  errorRate.add(res.status !== 200);
  latency.add(res.timings.duration);

  sleep(1);
}

export function agentMemory() {
  const messages = [
    "My name is Test User and I work on project Alpha",
    "What is my name?",
    "What project do I work on?",
  ];

  const sessionId = `mem-test-${__VU}`;

  for (const msg of messages) {
    const payload = JSON.stringify({ message: msg, sessionId });
    const res = http.post(`${BASE_URL}/api/ai/agent/chat`, payload, getHeaders());
    check(res, {
      "memory responded": (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
    tokenLatency.add(res.timings.duration);
    sleep(0.5);
  }
}

export function handleSummary(data) {
  return {
    "load-tests/results/ai-summary.json": JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: {
        ai_errors: data.metrics.ai_errors?.values || {},
        ai_latency: data.metrics.ai_latency?.values || {},
        ai_token_latency: data.metrics.ai_token_latency?.values || {},
      },
    }, null, 2),
  };
}
