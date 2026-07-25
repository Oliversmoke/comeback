import { check, sleep } from 'k6';
import ws from 'k6/ws';

const BASE_URL = __ENV.BASE_URL || 'ws://localhost:8080';
const USER_ID = __ENV.USER_ID || 'test-user';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const url = `${BASE_URL}/ws/chat`;
  const params = { headers: { 'X-User-ID': USER_ID } };

  const response = ws.connect(url, params, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type: 'join',
        payload: JSON.stringify({ chatId: 'test-chat-001' }),
      }));
    });

    socket.on('message', function (data) {
      const msg = JSON.parse(data);
      check(msg, {
        'received message': (m) => m.type !== undefined,
      });
    });

    socket.setTimeout(function () {
      socket.send(JSON.stringify({
        type: 'message',
        payload: JSON.stringify({
          chatId: 'test-chat-001',
          content: 'Load test message',
        }),
      }));
    }, 1000);

    socket.setTimeout(function () {
      socket.send(JSON.stringify({
        type: 'typing',
        payload: JSON.stringify({
          chatId: 'test-chat-001',
          isTyping: true,
        }),
      }));
    }, 2000);

    socket.setTimeout(function () {
      socket.send(JSON.stringify({
        type: 'leave',
        payload: JSON.stringify({ chatId: 'test-chat-001' }),
      }));
      socket.close();
    }, 5000);
  });

  check(response, { 'websocket connected': (r) => r && r.status === 101 });
  sleep(1);
}
