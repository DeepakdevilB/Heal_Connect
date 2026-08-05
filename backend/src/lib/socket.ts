import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from './jwt';
import { prisma } from './prisma';
import { flagContentIfNeeded } from './moderation';

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

    const joinedSessions = new Set<string>(); // Track which session rooms this socket is in

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
      joinedSessions.add(sessionId); // Track for disconnect cleanup

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
        
        // Timer only starts if the expert has accepted, and both are in the room.
        if (sess.status === 'INITIATED') return;
        if (sess.status === 'COMPLETED' || sess.status === 'REJECTED' || sess.status === 'CANCELLED') return;
        
        if (!sess.startTime) {
          if (roomSize < 2) return; // Wait for both parties

          // Both joined — start timer, set ACTIVE, fire session_started
          const startTime = new Date();
          prisma.session.update({
            where: { id: sessionId },
            data: { startTime, status: 'ACTIVE' },
          }).then(async () => {
            io!.to(`room:${sessionId}`).emit('session_started', { sessionId, startTime });
            
            // Set practitioner to busy
            await prisma.practitioner.update({
              where: { id: sess.practitionerId },
              data: { isBusy: true },
            });
            io!.emit('practitioner_status', { practitionerId: sess.practitionerId, isOnline: true, isBusy: true });
            
          }).catch(console.error);
        } else {
          // Session already started (reconnection) — just notify them
          io!.to(`room:${sessionId}`).emit('session_started', { sessionId, startTime: sess.startTime });
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

      // Task 7: scan message for phone numbers / policy violations (async, non-blocking)
      flagContentIfNeeded(content.trim(), 'CHAT', {
        sessionId,
        userId: senderId,
        practitionerId: senderType === 'PRACTITIONER' ? senderId : session.practitionerId,
        chatMessageId: message.id,
      }).catch((err) => console.error('[moderation] chat scan error:', err));

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

    // ── Disconnect: handle dropped calls + expert offline ───────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`);

      // Task 1: Mark any ACTIVE session this socket was in as DISCONNECTED.
      // This handles failed/dropped calls so the other party is notified.
      if (joinedSessions.size > 0) {
        for (const sessionId of joinedSessions) {
          prisma.session.findFirst({
            where: { id: sessionId, status: 'ACTIVE' },
          }).then((session) => {
            if (!session) return;
            // Only mark DISCONNECTED if the disconnecting party actually owns this session
            const isParticipant =
              session.userId === userId ||
              (practitionerId != null && session.practitionerId === practitionerId);
            if (!isParticipant) return;

            return prisma.session.update({
              where: { id: sessionId },
              data: { status: 'DISCONNECTED', endTime: new Date() },
            }).then(() => {
              // Notify the remaining party in the room
              io!.to(`room:${sessionId}`).emit('session_disconnected', {
                sessionId,
                reason: 'participant_disconnected',
                disconnectedUserId: userId,
              });
              console.log(`Session ${sessionId} marked DISCONNECTED (socket drop)`);
            });
          }).catch((err) => {
            console.error(`[socket] disconnect session cleanup error for ${sessionId}:`, err);
          });
        }
      }

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
