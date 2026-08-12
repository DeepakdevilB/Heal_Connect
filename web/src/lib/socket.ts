import { io, Socket } from 'socket.io-client';

// WebSocket connects directly to backend — Next.js rewrites only handle HTTP
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL ||
  'https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): Socket {
  // Reuse if connected with same token
  if (socket?.connected && currentToken === token) return socket;

  // Disconnect stale socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}
