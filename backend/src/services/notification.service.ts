import * as NotificationHubs from '@azure/notification-hubs';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const connectionString = process.env.AZURE_NOTIFICATION_HUB_CONNECTION_STRING || '';
const hubName = process.env.AZURE_NOTIFICATION_HUB_NAME || '';

let notificationClient: NotificationHubs.NotificationHubsClient | null = null;
if (connectionString && hubName) {
  notificationClient = new NotificationHubs.NotificationHubsClient(connectionString, hubName);
} else {
  console.warn('⚠ AZURE_NOTIFICATION_HUB_CONNECTION_STRING or AZURE_NOTIFICATION_HUB_NAME not set. Push notifications will be simulated and logged only.');
}

/**
 * Register a device token
 */
export async function registerDeviceToken(payload: {
  userId?: string;
  practitionerId?: string;
  token: string;
  platform: string;
}) {
  try {
    const existing = await prisma.deviceToken.findUnique({
      where: { token: payload.token }
    });

    if (existing) {
      await prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          userId: payload.userId || null,
          practitionerId: payload.practitionerId || null,
          platform: payload.platform,
        }
      });
    } else {
      await prisma.deviceToken.create({
        data: {
          token: payload.token,
          platform: payload.platform,
          userId: payload.userId || null,
          practitionerId: payload.practitionerId || null,
        }
      });
    }
  } catch (err) {
    console.error('Error registering device token:', err);
  }
}

/**
 * Remove a device token (e.g. on logout)
 */
export async function removeDeviceToken(token: string) {
  try {
    await prisma.deviceToken.deleteMany({
      where: { token }
    });
  } catch (err) {
    console.error('Error removing device token:', err);
  }
}

/**
 * Log notification to DB
 */
async function logNotification(data: {
  recipientId: string;
  recipientType: 'USER' | 'PRACTITIONER';
  type: string;
  title: string;
  body: string;
  entityId?: string | undefined;
  status: 'SENT' | 'FAILED';
  errorMsg?: string | undefined;
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        recipientId: data.recipientId,
        recipientType: data.recipientType,
        type: data.type,
        title: data.title,
        body: data.body,
        entityId: data.entityId || null,
        status: data.status,
        errorMsg: data.errorMsg || null
      }
    });
  } catch (err) {
    console.error('Error logging notification:', err);
  }
}

/**
 * Internal method to send payload to a specific token
 */
async function sendToToken(token: string, platform: string, payload: { title: string; body: string }) {
  if (!notificationClient) {
    console.log(`[SIMULATE PUSH] To: ${token}, Platform: ${platform}, Title: ${payload.title}, Body: ${payload.body}`);
    return;
  }

  try {
    if (platform.toLowerCase() === 'android' || platform.toLowerCase() === 'web') {
      const message = NotificationHubs.createFcmV1Notification({
        body: JSON.stringify({
          message: {
            notification: {
              title: payload.title,
              body: payload.body,
            }
          }
        })
      });
      await notificationClient.sendNotification(message, { enableTestSend: false, deviceHandle: token });
    } else if (platform.toLowerCase() === 'ios') {
      const message = NotificationHubs.createAppleNotification({
        body: JSON.stringify({
          aps: {
            alert: {
              title: payload.title,
              body: payload.body
            }
          }
        })
      });
      await notificationClient.sendNotification(message, { enableTestSend: false, deviceHandle: token });
    }
  } catch (err: any) {
    throw err;
  }
}

/**
 * Send notification to a User
 */
export async function sendNotificationToUser(userId: string, payload: { type: string; title: string; body: string; entityId?: string }) {
  try {
    const tokens = await prisma.deviceToken.findMany({ where: { userId } });
    if (!tokens.length) {
      await logNotification({
        recipientId: userId,
        recipientType: 'USER',
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityId: payload.entityId,
        status: 'FAILED',
        errorMsg: 'No device tokens found for user'
      });
      return;
    }

    let successCount = 0;
    let lastError: string | undefined = undefined;

    for (const device of tokens) {
      try {
        await sendToToken(device.token, device.platform, payload);
        successCount++;
      } catch (err: any) {
        lastError = err.message;
        // If token is unregistered, we should delete it
        if (err.message?.includes('Unregistered') || err.message?.includes('NotRegistered')) {
          await removeDeviceToken(device.token);
        }
      }
    }

    await logNotification({
      recipientId: userId,
      recipientType: 'USER',
      type: payload.type,
      title: payload.title,
      body: payload.body,
      entityId: payload.entityId || undefined,
      status: successCount > 0 ? 'SENT' : 'FAILED',
      errorMsg: successCount > 0 ? undefined : lastError || 'All deliveries failed'
    });
  } catch (err) {
    console.error('Error sending notification to user:', err);
  }
}

/**
 * Send notification to a Practitioner
 */
export async function sendNotificationToPractitioner(practitionerId: string, payload: { type: string; title: string; body: string; entityId?: string }) {
  try {
    const tokens = await prisma.deviceToken.findMany({ where: { practitionerId } });
    if (!tokens.length) {
      await logNotification({
        recipientId: practitionerId,
        recipientType: 'PRACTITIONER',
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityId: payload.entityId,
        status: 'FAILED',
        errorMsg: 'No device tokens found for practitioner'
      });
      return;
    }

    let successCount = 0;
    let lastError: string | undefined = undefined;

    for (const device of tokens) {
      try {
        await sendToToken(device.token, device.platform, payload);
        successCount++;
      } catch (err: any) {
        lastError = err.message;
        if (err.message?.includes('Unregistered') || err.message?.includes('NotRegistered')) {
          await removeDeviceToken(device.token);
        }
      }
    }

    await logNotification({
      recipientId: practitionerId,
      recipientType: 'PRACTITIONER',
      type: payload.type,
      title: payload.title,
      body: payload.body,
      entityId: payload.entityId || undefined,
      status: successCount > 0 ? 'SENT' : 'FAILED',
      errorMsg: successCount > 0 ? undefined : lastError || 'All deliveries failed'
    });
  } catch (err) {
    console.error('Error sending notification to practitioner:', err);
  }
}
