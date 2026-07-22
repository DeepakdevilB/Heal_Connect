import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    // In dev, frontend connects to backend (default localhost:8080 or window.location.origin)
    const backendUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:8082';

    socket = io(backendUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected to server:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });
  }

  return socket;
}

export function joinRoom(data: { userId?: string; practitionerId?: string; consultationId?: string }) {
  const s = getSocket();
  if (s) {
    s.emit('join-room', data);
  }
}

export function leaveRoom(room: string) {
  const s = getSocket();
  if (s) {
    s.emit('leave-room', room);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
