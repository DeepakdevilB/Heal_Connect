import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import type { Express } from 'express';
import { verifyAccessToken } from './jwt';
import { isTokenBlacklisted } from './redis';
import { prisma } from './prisma';
import { redis } from './redis';

let io: Server;

// ─── Auth Middleware ──────────────────────────────────────────────────────────

async function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error('No token provided'));

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) return next(new Error('Token revoked'));

    const payload = verifyAccessToken(token);
    (socket as any).userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

// ─── Typing indicator helpers (Redis TTL-based) ───────────────────────────────

async function setTyping(sessionId: string, userId: string, isTyping: boolean) {
  if (!redis) return;
  const key = `typing:${sessionId}:${userId}`;
  if (isTyping) {
    await redis.set(key, '1', 'EX', 5); // auto-expire after 5s
  } else {
    await redis.del(key);
  }
}

// ─── Socket Event Handlers ────────────────────────────────────────────────────

function registerHandlers(socket: Socket) {
  const userId = (socket as any).userId as string;

  // Join a session chat room
  socket.on('join_room', async ({ sessionId }: { sessionId: string }) => {
    try {
      // Verify user belongs to this session
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          OR: [{ userId }, { practitionerId: userId }],
        },
      });
      if (!session) {
        socket.emit('error', { message: 'Session not found or access denied' });
        return;
      }

      socket.join(`room:${sessionId}`);
      socket.emit('joined_room', { sessionId });

      // Send last 50 messages on join
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      socket.emit('message_history', { messages });
    } catch (err) {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Send a message
  socket.on('send_message', async ({ sessionId, content }: { sessionId: string; content: string }) => {
    try {
      if (!content?.trim()) return;

      // Determine senderType
      const session = await prisma.session.findFirst({
        where: { id: sessionId, OR: [{ userId }, { practitionerId: userId }] },
      });
      if (!session) return;

      const senderType = session.userId === userId ? 'USER' : 'PRACTITIONER';

      const message = await prisma.chatMessage.create({
        data: { sessionId, senderId: userId, senderType, content: content.trim() },
      });

      // Broadcast to everyone in the room (including sender)
      io.to(`room:${sessionId}`).emit('new_message', { message });

      // Clear typing indicator on send
      await setTyping(sessionId, userId, false);
      io.to(`room:${sessionId}`).emit('typing_update', { userId, isTyping: false });
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicators
  socket.on('typing_start', async ({ sessionId }: { sessionId: string }) => {
    await setTyping(sessionId, userId, true);
    socket.to(`room:${sessionId}`).emit('typing_update', { userId, isTyping: true });
  });

  socket.on('typing_stop', async ({ sessionId }: { sessionId: string }) => {
    await setTyping(sessionId, userId, false);
    socket.to(`room:${sessionId}`).emit('typing_update', { userId, isTyping: false });
  });

  // Read receipts
  socket.on('message_read', async ({ sessionId, messageId }: { sessionId: string; messageId: string }) => {
    try {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isRead: true, readAt: new Date() },
      });
      io.to(`room:${sessionId}`).emit('receipt_update', { messageId, readBy: userId, readAt: new Date() });
    } catch {
      // silently ignore if message not found
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id} (user: ${userId})`);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initSocketServer(app: Express) {
  const httpServer = createServer(app);

  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Azure Web PubSub adapter for horizontal scaling (only if configured)
  if (process.env.AZURE_WEB_PUBSUB_CONNECTION_STRING) {
    // Dynamically import to avoid socket.io version conflict at compile time
    const { useAzureSocketIO } = await import('@azure/web-pubsub-socket.io');
    await useAzureSocketIO(io as any, {
      hub: 'healconnect',
      connectionString: process.env.AZURE_WEB_PUBSUB_CONNECTION_STRING,
    });
    console.log('✦ Socket.IO using Azure Web PubSub adapter');
  } else {
    console.warn('⚠ AZURE_WEB_PUBSUB_CONNECTION_STRING not set — using in-process Socket.IO (single instance only)');
  }

  io.use(authenticateSocket);
  io.on('connection', registerHandlers);

  console.log('✦ Socket.IO server initialized');
  return httpServer;
}

// Export io instance so billingEngine can emit events
export function getIO(): Server {
  return io;
}
