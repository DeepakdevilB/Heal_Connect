import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from './jwt';
import { prisma } from './prisma';

let io: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Auth middleware — attach userId or practitionerId from JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No token'));
    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).practitionerId = payload.practitionerId ?? null;
      console.log(`🔐 Socket auth: userId=${payload.userId} practitionerId=${payload.practitionerId ?? 'none'}`);
      next();
    } catch (err) {
      console.error('Socket auth error:', err);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = (socket as any).userId;
    const practitionerId: string | null = (socket as any).practitionerId;

    console.log(`🔌 Connected: ${socket.id} user=${userId} practitioner=${practitionerId ?? 'none'}`);

    // Join practitioner room (but do NOT force them online automatically)
    if (practitionerId) {
      socket.join(`practitioner_${practitionerId}`);
    }

    // User joins their personal room
    socket.join(`user_${userId}`);

    // ── Join a session room ──────────────────────────────────────────────────
    socket.on('join_room', async ({ sessionId }: { sessionId: string }) => {
      // Verify this socket belongs to this session
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          OR: [{ userId }, ...(practitionerId ? [{ practitionerId }] : [])],
        },
      });
      if (!session) { socket.emit('error', { message: 'Session not found' }); return; }

      socket.join(`room:${sessionId}`);

      // Send message history
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      socket.emit('message_history', { messages });
      socket.emit('joined_room', { sessionId });

      // Notify the other party that someone joined
      socket.to(`room:${sessionId}`).emit('peer_joined', { sessionId });

      // Start session as soon as the first party joins (don't wait for both)
      // If both are already in room, just emit; otherwise set startTime on first join
      const room = io!.sockets.adapter.rooms.get(`room:${sessionId}`);
      const roomSize = room ? room.size : 1;

      prisma.session.findUnique({ where: { id: sessionId } }).then((sess) => {
        if (!sess) return;
        if (!sess.startTime) {
          // First joiner — set startTime and fire session_started to whole room
          prisma.session.update({
            where: { id: sessionId },
            data: { startTime: new Date() },
          }).then(() => {
            io!.to(`room:${sessionId}`).emit('session_started', { sessionId });
          }).catch(console.error);
        } else {
          // Session already started (second party joining later) — just notify them
          io!.to(`room:${sessionId}`).emit('session_started', { sessionId });
        }
      }).catch(console.error);
    });

    // ── Send message ─────────────────────────────────────────────────────────
    socket.on('send_message', async ({ sessionId, content }: { sessionId: string; content: string }) => {
      if (!content?.trim()) return;

      // Verify session is active and sender belongs to it
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          status: 'ACTIVE',
          OR: [{ userId }, ...(practitionerId ? [{ practitionerId }] : [])],
        },
      });
      if (!session) { socket.emit('error', { message: 'Session not active' }); return; }

      const senderType = practitionerId && session.practitionerId === practitionerId ? 'PRACTITIONER' : 'USER';
      const senderId = senderType === 'PRACTITIONER' ? practitionerId! : userId;

      const message = await prisma.chatMessage.create({
        data: { sessionId, senderId, senderType, content: content.trim() },
      });

      io!.to(`room:${sessionId}`).emit('new_message', { message });
    });

    // ── Typing indicators ────────────────────────────────────────────────────
    socket.on('typing_start', ({ sessionId }: { sessionId: string }) => {
      socket.to(`room:${sessionId}`).emit('typing_update', { userId, isTyping: true });
    });

    socket.on('typing_stop', ({ sessionId }: { sessionId: string }) => {
      socket.to(`room:${sessionId}`).emit('typing_update', { userId, isTyping: false });
    });

    // ── Read receipts ────────────────────────────────────────────────────────
    socket.on('message_read', async ({ sessionId, messageId }: { sessionId: string; messageId: string }) => {
      const readAt = new Date();
      await prisma.chatMessage.updateMany({
        where: { id: messageId, sessionId },
        data: { isRead: true, readAt },
      });
      io!.to(`room:${sessionId}`).emit('receipt_update', { messageId, readAt: readAt.toISOString() });
    });

    // ── Disconnect: expert goes offline ──────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`);
      if (practitionerId) {
        // Only set offline if no other sockets are connected for this practitioner
        const roomSize = io!.sockets.adapter.rooms.get(`practitioner_${practitionerId}`)?.size || 0;
        if (roomSize === 0) {
          prisma.practitioner.update({ where: { id: practitionerId }, data: { isOnline: false } })
            .then(() => {
              io!.emit('practitioner_status', { practitionerId, isOnline: false });
            })
            .catch(console.error);
        }
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null { return io; }

// Emit to a session room + optionally to specific user/practitioner rooms
export function emitConsultationEvent(
  event: string,
  consultationId: string,
  payload: unknown,
  targetIds?: { userId?: string; practitionerId?: string }
) {
  if (!io) return;
  io.to(`room:${consultationId}`).emit(event, payload);
  if (targetIds?.userId) io.to(`user_${targetIds.userId}`).emit(event, payload);
  if (targetIds?.practitionerId) io.to(`practitioner_${targetIds.practitionerId}`).emit(event, payload);
}
