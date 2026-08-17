import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import { registerDeviceToken, removeDeviceToken } from '../services/notification.service';

const router = Router();

// Register a device token for push notifications
router.post(
  '/tokens',
  requireAuth,
  [
    body('token').isString().notEmpty(),
    body('platform').isIn(['android', 'ios', 'web']).withMessage('Invalid platform')
  ],
  handleValidation,
  async (req: any, res: any) => {
    try {
      const { token, platform } = req.body;
      // JwtPayload (middleware/auth.ts) is { userId, practitionerId?, email? } —
      // there is no `id`/`type` field. This previously destructured `id`/`type`
      // (which don't exist on req.user, so both were always undefined),
      // meaning every device token was saved with userId AND practitionerId
      // both null — orphaned, never matched by sendNotificationToUser/
      // sendNotificationToPractitioner. Push notifications were silently
      // broken for everyone.
      const isPractitioner = Boolean(req.user.practitionerId);

      await registerDeviceToken({
        token,
        platform,
        userId: isPractitioner ? undefined : req.user.userId,
        practitionerId: isPractitioner ? req.user.practitionerId : undefined,
      });

      res.status(200).json({ success: true, message: 'Device token registered' });
    } catch (err) {
      console.error('Error registering device token route:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// Remove a device token (e.g. on logout)
router.delete(
  '/tokens/:token',
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { token } = req.params;
      await removeDeviceToken(token);
      res.json({ success: true, message: 'Device token removed' });
    } catch (err) {
      console.error('Remove token error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// DEV ENDPOINT: Test push notification. Was completely unauthenticated
// ("No auth required for testing") and let any caller send arbitrary
// title/body push content to any userId/practitionerId by ID — the same
// "dev helper left open in production" pattern already found and fixed in
// wallet.ts /dev-recharge, practitioners.ts /dev/verify, sessions.ts
// /dev-clear, and admin.ts /migrate. Gated behind requireAdmin now.
router.post(
  '/test',
  requireAdmin,
  async (req: any, res: any) => {
    try {
      const { practitionerId, userId, message } = req.body;
      const { sendNotificationToPractitioner, sendNotificationToUser } = await import('../services/notification.service');
      
      if (practitionerId) {
        await sendNotificationToPractitioner(practitionerId, {
          type: 'TEST_NOTIFICATION',
          title: 'Test Practitioner Notification',
          body: message || 'This is a test notification for a practitioner.',
        });
      }
      
      if (userId) {
        await sendNotificationToUser(userId, {
          type: 'TEST_NOTIFICATION',
          title: 'Test User Notification',
          body: message || 'This is a test notification for a user.',
        });
      }

      res.json({ success: true, message: 'Test notification triggered. Check logs if simulated.' });
    } catch (err) {
      console.error('Test notification error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
