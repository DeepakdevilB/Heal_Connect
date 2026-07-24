import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join room based on user/practitioner role or session
    socket.on('join-room', (data: { userId?: string; practitionerId?: string; consultationId?: string }) => {
      if (data.userId) {
        socket.join(`user_${data.userId}`);
        console.log(`Socket ${socket.id} joined room user_${data.userId}`);
      }
      if (data.practitionerId) {
        socket.join(`practitioner_${data.practitionerId}`);
        console.log(`Socket ${socket.id} joined room practitioner_${data.practitionerId}`);
      }
      if (data.consultationId) {
        socket.join(`consultation_${data.consultationId}`);
        console.log(`Socket ${socket.id} joined room consultation_${data.consultationId}`);
      }
    });

    socket.on('leave-room', (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitConsultationEvent(event: string, consultationId: string, payload: unknown, targetIds?: { userId?: string; practitionerId?: string }) {
  if (!io) return;
  // Emit to consultation room
  io.to(`consultation_${consultationId}`).emit(event, payload);

  // Emit to specific user/practitioner if provided
  if (targetIds?.userId) {
    io.to(`user_${targetIds.userId}`).emit(event, payload);
  }
  if (targetIds?.practitionerId) {
    io.to(`practitioner_${targetIds.practitionerId}`).emit(event, payload);
  }
}
