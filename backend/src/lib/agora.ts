import { RtcTokenBuilder, RtcRole } from 'agora-token';

const AGORA_APP_ID = process.env.AGORA_APP_ID || 'test_agora_app_id';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

export function generateAgoraRtcToken(
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber' = 'publisher',
  expireTimeInSeconds: number = 3600
): { token: string; appId: string; channelName: string; uid: number } {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireTimeInSeconds;
  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  let token = '';

  if (AGORA_APP_ID && AGORA_APP_CERTIFICATE) {
    try {
      token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        rtcRole,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
    } catch (err) {
      console.error('Failed to generate Agora token via SDK:', err);
      token = '';
    }
  } else {
    // If App Certificate is not configured (e.g. dev/testing mode with app ID only), return empty string token
    token = '';
  }

  return {
    token,
    appId: AGORA_APP_ID,
    channelName,
    uid,
  };
}
