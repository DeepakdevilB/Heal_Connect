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

      // Fail closed, never leak the master key to the browser. Both env vars are
      // required to issue a short-lived scoped credential; if either is missing,
      // report "not configured" rather than falling back to the raw master key —
      // that master key would otherwise get sent straight to the client and used
      // in a browser-side WebSocket (visible in devtools Network tab to anyone).
      if (!deepgramApiKey || !deepgramProjectId) {
        res.json({
          success: true,
          data: {
            isConfigured: false,
            message: 'Deepgram STT not configured in environment',
          },
        });
        return;
      }

      // Create a short-lived ephemeral key (TTL: 1 hour), scoped to this session only.
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

        if (!keyRes.ok) {
          throw new Error(`Deepgram key creation failed with status ${keyRes.status}`);
        }

        const keyData = (await keyRes.json()) as { key: string };
        res.json({
          success: true,
          data: {
            apiKey: keyData.key,
            isConfigured: true,
            isEphemeral: true,
          },
        });
      } catch (keyErr) {
        // Do NOT fall back to the master key here — report unconfigured/unavailable
        // instead so the frontend degrades gracefully (same path it already uses
        // when DEEPGRAM_API_KEY itself is unset).
        console.error('[Deepgram] Ephemeral key creation failed, refusing to fall back to master key:', keyErr);
        res.json({
          success: true,
          data: {
            isConfigured: false,
            message: 'Deepgram STT temporarily unavailable',
          },
        });
      }
    } catch (err) {
      console.error('[Deepgram] Error generating STT token:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
