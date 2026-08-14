import { Router, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

// ─── POST /api/deepgram/token ──────────────────────────────────────────────────
// Returns a scoped Deepgram credential for the active call session.
// If DEEPGRAM_API_KEY is not set in environment, returns isConfigured: false
// so the frontend client can gracefully fall back without erroring.
router.post(
  '/token',
  requireAuth,
  [body('sessionId').notEmpty().withMessage('Session ID is required')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.body as { sessionId: string };
    const userId = req.user!.userId;
    const practitionerId = req.user!.practitionerId;

    try {
      // 1. Verify caller belongs to this session
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          OR: [
            { userId },
            ...(practitionerId ? [{ practitionerId }] : [{ practitionerId: userId }]),
          ],
        },
        select: { id: true, type: true, status: true },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found or unauthorized' });
        return;
      }

      if (session.type === 'CHAT') {
        res.status(400).json({ success: false, message: 'Transcripts are only for audio/video sessions' });
        return;
      }

      const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
      const deepgramProjectId = process.env.DEEPGRAM_PROJECT_ID;

      if (!deepgramApiKey) {
        res.json({
          success: true,
          data: {
            isConfigured: false,
            message: 'Deepgram STT not configured in environment',
          },
        });
        return;
      }

      // If a project ID is configured, create a short-lived ephemeral key (TTL: 1 hour)
      if (deepgramProjectId) {
        try {
          const keyRes = await fetch(
            `https://api.deepgram.com/v1/projects/${deepgramProjectId}/keys`,
            {
              method: 'POST',
              headers: {
                Authorization: `Token ${deepgramApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                comment: `Session-${sessionId}-${Date.now()}`,
                time_to_live_in_seconds: 3600,
                scopes: ['usage:write'],
              }),
            }
          );

          if (keyRes.ok) {
            const keyData = (await keyRes.json()) as { key: string };
            res.json({
              success: true,
              data: {
                apiKey: keyData.key,
                isConfigured: true,
                isEphemeral: true,
              },
            });
            return;
          }
        } catch (keyErr) {
          console.warn('[Deepgram] Ephemeral key creation failed, falling back to direct key:', keyErr);
        }
      }

      // Fallback: Return the configured API key with write-only usage recommendation
      res.json({
        success: true,
        data: {
          apiKey: deepgramApiKey,
          isConfigured: true,
          isEphemeral: false,
        },
      });
    } catch (err) {
      console.error('[Deepgram] Error generating STT token:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
