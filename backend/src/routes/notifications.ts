import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
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
      const { id, type } = req.user;

      await registerDeviceToken({
        token,
        platform,
        userId: type === 'USER' ? id : undefined,
        practitionerId: type === 'PRACTITIONER' ? id : undefined
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

// DEV ENDPOINT: Test push notification (No auth required for testing)
router.post(
  '/test',
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
