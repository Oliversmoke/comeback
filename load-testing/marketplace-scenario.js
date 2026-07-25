import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const errorRate = new Rate('errors');
const marketplaceLatency = new Trend('marketplace_latency');

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    marketplace_latency: ['p(95)<2000'],
  },
};

const token = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-User-ID': __ENV.USER_ID || 'load-test-user',
};

export default function () {
  group('Marketplace Browsing', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/marketplace?page=1&limit=20&category=ai-models`, {
      headers,
    });
    marketplaceLatency.add(Date.now() - start);
    check(res, {
      'marketplace list ok': (r) => r.status === 200,
    });
  });

  group('Marketplace Search', () => {
    const res = http.get(`${BASE_URL}/marketplace?q=chat&page=1&limit=10`, {
      headers,
    });
    check(res, { 'search ok': (r) => r.status === 200 });
  });

  group('Item Details', () => {
    const res = http.get(`${BASE_URL}/marketplace/item-001`, {
      headers,
    });
    check(res, { 'item detail ok': (r) => r.status === 200 });
  });

  sleep(Math.random() * 2 + 0.5);
}
