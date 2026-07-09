// k6 load test script
// Run with: k6 run --vus 10 --duration 30s tests/backend/performance/load-test.js
// Requires k6: https://k6.io/docs/getting-started/installation/

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const AUTH_EMAIL = `loadtest-${__VU}@example.com`;
const AUTH_PASSWORD = 'SecurePass123';

const authFailureRate = new Rate('auth_failures');
const uploadDuration = new Trend('upload_duration');
const apiResponseTime = new Trend('api_response_time');

export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up to 20 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    auth_failures: ['rate<0.1'],       // Less than 10% auth failures
  },
};

export function setup() {
  // Sign up a test user
  const signupRes = http.post(`${BASE_URL}/api/auth/signup`, JSON.stringify({
    name: 'Load Test User',
    email: AUTH_EMAIL,
    password: AUTH_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(signupRes, { 'signup successful': (r) => r.status === 201 });

  const body = signupRes.json();
  return { token: body.data?.token || body.token };
}

export default function(data) {
  const token = data.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  group('auth endpoints', () => {
    // Login
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: AUTH_EMAIL,
      password: AUTH_PASSWORD,
    }), { headers: { 'Content-Type': 'application/json' } });

    authFailureRate.add(loginRes.status !== 200);
    check(loginRes, { 'login successful': (r) => r.status === 200 });
    apiResponseTime.add(loginRes.timings.duration);
  });

  group('task CRUD', () => {
    // Create task
    const createRes = http.post(`${BASE_URL}/api/tasks`, JSON.stringify({
      title: `Load test task ${__VU}-${__ITER}`,
      orgId: 'loadtest-org',
    }), { headers });

    check(createRes, { 'task created': (r) => r.status === 201 });
    apiResponseTime.add(createRes.timings.duration);

    if (createRes.status === 201) {
      const taskBody = createRes.json();
      const taskId = taskBody.data?.id || taskBody.id;

      // Get task
      const getRes = http.get(`${BASE_URL}/api/tasks/${taskId}`, { headers });
      check(getRes, { 'task retrieved': (r) => r.status === 200 });
      apiResponseTime.add(getRes.timings.duration);
    }

    // List tasks
    const listRes = http.get(`${BASE_URL}/api/tasks?page=1&limit=20`, { headers });
    check(listRes, { 'task list retrieved': (r) => r.status === 200 });
    apiResponseTime.add(listRes.timings.duration);
  });

  group('health check', () => {
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, { 'health check ok': (r) => r.status === 200 });
  });

  sleep(1);
}

export function teardown(data) {
  // Cleanup: delete test user
  if (data?.token) {
    http.del(`${BASE_URL}/api/auth/account`, null, {
      headers: { 'Authorization': `Bearer ${data.token}` },
    });
  }
}
