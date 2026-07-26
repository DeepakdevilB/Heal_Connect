import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/chat/:sessionId/messages?cursor=<messageId>&limit=50
router.get('/:sessionId/messages', requireAuth, async (req: AuthRequest, res) => {
  const sessionId = String(req.params['sessionId']);
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const cursor = req.query.cursor as string | undefined;
  const userId = req.user!.userId;

  // Verify access
  const session = await prisma.session.findFirst({
    where: { id: sessionId, OR: [{ userId }, { practitionerId: userId }] },
  });
  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  res.json({ success: true, data: { messages: messages.reverse() } });
});

export default router;
