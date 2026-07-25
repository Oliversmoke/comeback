import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';
const errorRate = new Rate('errors');
const chatLatency = new Trend('chat_latency');
const authLatency = new Trend('auth_latency');
const memoryLatency = new Trend('memory_latency');
const successfulRequests = new Counter('successful_requests');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '10m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.10'],
    chat_latency: ['p(95)<5000'],
    auth_latency: ['p(95)<2000'],
  },
};

const users = Array.from({ length: 100 }, (_, i) => ({
  email: `loadtest${i}@rickchat.ai`,
  password: 'TestP@ss123',
  username: `loaduser${i}`,
}));

export function setup() {
  const registeredUsers = [];
  for (const user of users.slice(0, 10)) {
    const res = http.post(`${baseUrl}/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 201) {
      registeredUsers.push(JSON.parse(res.body).data);
    }
  }
  return { users: registeredUsers };
}

export default function (data) {
  if (data.users.length === 0) {
    sleep(1);
    return;
  }

  const user = data.users[Math.floor(Math.random() * data.users.length)];

  group('Authentication', () => {
    const start = Date.now();
    const res = http.post(`${baseUrl}/auth/login`, JSON.stringify({
      email: user.email,
      password: 'TestP@ss123',
    }), { headers: { 'Content-Type': 'application/json' } });

    authLatency.add(Date.now() - start);
    check(res, {
      'login successful': (r) => r.status === 200,
      'has token': (r) => JSON.parse(r.body).data.accessToken !== undefined,
    });

    if (res.status === 200) {
      errorRate.add(0);
      successfulRequests.add(1);
      const token = JSON.parse(res.body).data.accessToken;
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      group('Chat Operations', () => {
        const chatsRes = http.get(`${baseUrl}/chat`, {
          headers: authHeaders,
        });
        check(chatsRes, {
          'list chats': (r) => r.status === 200,
        });

        if (chatsRes.status === 200) {
          const chatStart = Date.now();
          const msgRes = http.post(`${baseUrl}/ai/chat`, JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello, how are you?' }],
            temperature: 0.7,
          }), { headers: authHeaders });

          chatLatency.add(Date.now() - chatStart);
          check(msgRes, {
            'ai response received': (r) => r.status === 200,
          });
        }
      });

      group('Memory Operations', () => {
        const memStart = Date.now();
        const memRes = http.post(`${baseUrl}/memory`, JSON.stringify({
          type: 'knowledge',
          content: 'Important information for load testing',
          tags: ['loadtest', 'test'],
          importance: 5,
        }), { headers: authHeaders });

        memoryLatency.add(Date.now() - memStart);
        check(memRes, {
          'memory created': (r) => r.status === 201,
        });
      });

      group('User Profile', () => {
        const profileRes = http.get(`${baseUrl}/users/me`, {
          headers: authHeaders,
        });
        check(profileRes, {
          'profile retrieved': (r) => r.status === 200,
        });
      });
    } else {
      errorRate.add(1);
    }
  });

  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  // Cleanup registered users
}
