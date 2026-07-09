// k6 soak test - sustained load to catch memory leaks
// Run with: k6 run --vus 20 --duration 30m tests/backend/performance/soak-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

const responseTime = new Trend('response_time');
const memoryUsage = new Trend('memory_usage');

export const options = {
  vus: 20,
  duration: '30m',
  thresholds: {
    http_req_duration: ['p(95)<3000'], // Allow slightly higher during soak
    http_req_failed: ['rate<0.05'],    // Less than 5% failures
  },
};

export default function() {
  const start = Date.now();

  // Consistent health check to verify server is alive
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, { 'health check passed': (r) => r.status === 200 });

  responseTime.add(Date.now() - start);

  // Gradually increase memory pressure
  const heavyRes = http.get(`${BASE_URL}/api/tasks?page=1&limit=100`);
  check(heavyRes, { 'task list returned': (r) => r.status === 200 });

  sleep(5); // Longer sleep for sustained load
}
