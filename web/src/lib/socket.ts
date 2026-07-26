import { io, Socket } from 'socket.io-client';

// WebSocket connects directly to backend — Next.js rewrites only handle HTTP
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL ||
  'https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
