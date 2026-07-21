import { io } from 'socket.io-client';

export function createSocket() {
  return io({
    auth: {
      token: localStorage.getItem('sb_token') || undefined,
    },
  });
}
