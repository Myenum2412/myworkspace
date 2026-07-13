import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const latency = new Trend("latency");

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

export const options = {
  scenarios: {
    // Scenario 1: Normal load (100 users)
    normal_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "2m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "normalFlow",
    },
    // Scenario 2: Peak load (500 users)
    peak_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 500 },
        { duration: "3m", target: 500 },
        { duration: "1m", target: 0 },
      ],
      exec: "peakFlow",
    },
    // Scenario 3: Stress test (1000 users)
    stress_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 1000 },
        { duration: "5m", target: 1000 },
        { duration: "2m", target: 0 },
      ],
      exec: "stressFlow",
    },
    // Scenario 4: Spike test (5000 users)
    spike_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 5000 },
        { duration: "1m", target: 5000 },
        { duration: "10s", target: 0 },
      ],
      exec: "spikeFlow",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.05"],
    errors: ["rate<0.05"],
  },
};

// ── Shared login function ──
function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const params = {
    headers: { "Content-Type": "application/json" },
  };
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  return res;
}

// ── Scenario: Normal Load ──
export function normalFlow() {
  // Login
  const loginRes = login("test@example.com", "password123");
  check(loginRes, {
    "login successful": (r) => r.status === 200 || r.status === 302,
  });
  errorRate.add(loginRes.status !== 200 && loginRes.status !== 302);
  latency.add(loginRes.timings.duration);

  sleep(1);

  // Fetch dashboard
  const dashboardRes = http.get(`${BASE_URL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${loginRes.json("token")}` },
  });
  check(dashboardRes, {
    "dashboard loaded": (r) => r.status === 200,
  });
  errorRate.add(dashboardRes.status !== 200);
  latency.add(dashboardRes.timings.duration);

  sleep(2);

  // Fetch tasks
  const tasksRes = http.get(`${BASE_URL}/api/tasks?limit=20`, {
    headers: { Authorization: `Bearer ${loginRes.json("token")}` },
  });
  check(tasksRes, {
    "tasks loaded": (r) => r.status === 200,
  });
  errorRate.add(tasksRes.status !== 200);
  latency.add(tasksRes.timings.duration);

  sleep(1);
}

// ── Scenario: Peak Load ──
export function peakFlow() {
  const loginRes = login("test@example.com", "password123");
  check(loginRes, { "login ok": (r) => r.status === 200 || r.status === 302 });
  errorRate.add(loginRes.status !== 200 && loginRes.status !== 302);
  latency.add(loginRes.timings.duration);

  sleep(0.5);

  const token = loginRes.json("token");
  const endpoints = ["/api/tasks", "/api/projects", "/api/users/status", "/api/notifications"];

  for (const endpoint of endpoints) {
    const res = http.get(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(res, { [`${endpoint} ok`]: (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    latency.add(res.timings.duration);
    sleep(0.3);
  }
}

// ── Scenario: Stress Test ──
export function stressFlow() {
  const loginRes = login("test@example.com", "password123");
  check(loginRes, { "login ok": (r) => r.status === 200 || r.status === 302 });
  errorRate.add(loginRes.status !== 200 && loginRes.status !== 302);
  latency.add(loginRes.timings.duration);

  sleep(0.2);

  const token = loginRes.json("token");
  const res = http.get(`${BASE_URL}/api/tasks?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { "tasks ok": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  latency.add(res.timings.duration);

  sleep(0.5);
}

// ── Scenario: Spike Test ──
export function spikeFlow() {
  const loginRes = login("test@example.com", "password123");
  check(loginRes, { "login ok": (r) => r.status === 200 || r.status === 302 });
  errorRate.add(loginRes.status !== 200 && loginRes.status !== 302);
  latency.add(loginRes.timings.duration);

  const token = loginRes.json("token");
  const res = http.get(`${BASE_URL}/api/health`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { "health ok": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  latency.add(res.timings.duration);

  sleep(0.1);
}

// ── Summary ──
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      http_reqs: data.metrics.http_reqs?.values || {},
      http_req_duration: data.metrics.http_req_duration?.values || {},
      http_req_failed: data.metrics.http_req_failed?.values || {},
      errors: data.metrics.errors?.values || {},
      latency: data.metrics.latency?.values || {},
    },
    scenarios: {},
  };

  for (const [name, scenario] of Object.entries(data.metrics || {})) {
    if (name.includes("vus") || name.includes("iterations")) {
      summary.scenarios[name] = scenario?.values || {};
    }
  }

  return {
    "load-tests/summary.json": JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

function textSummary(data) {
  let output = "\n═══════════════════════════════════════\n";
  output += "  MyWorkSpace Load Test Results\n";
  output += "═══════════════════════════════════════\n\n";

  const httpReqs = data.metrics.http_reqs?.values || {};
  output += `Total Requests: ${httpReqs.count || 0}\n`;
  output += `Request Rate: ${(httpReqs.rate || 0).toFixed(2)}/s\n\n`;

  const duration = data.metrics.http_req_duration?.values || {};
  output += `Latency p50: ${(duration.med || 0).toFixed(2)}ms\n`;
  output += `Latency p95: ${(duration["p(95)"] || 0).toFixed(2)}ms\n`;
  output += `Latency p99: ${(duration["p(99)"] || 0).toFixed(2)}ms\n\n`;

  const failed = data.metrics.http_req_failed?.values || {};
  output += `Error Rate: ${((failed.rate || 0) * 100).toFixed(2)}%\n`;

  output += "\n═══════════════════════════════════════\n";
  return output;
}
