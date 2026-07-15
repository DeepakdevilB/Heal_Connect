import twilio from 'twilio';

const accountSid  = process.env.TWILIO_ACCOUNT_SID  || '';
const authToken   = process.env.TWILIO_AUTH_TOKEN   || '';
const serviceSid  = process.env.TWILIO_VERIFY_SERVICE_SID || '';

/** Returns true if Twilio Verify is fully configured. */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && serviceSid);
}

function getClient() {
  if (!isTwilioConfigured()) throw new Error('Twilio is not configured.');
  return twilio(accountSid, authToken);
}

/**
 * Sends an OTP to the given phone number via Twilio Verify.
 * Twilio handles generation, delivery, and expiry automatically.
 */
export async function sendOtpSms(to: string): Promise<void> {
  const client = getClient();
  await client.verify.v2.services(serviceSid).verifications.create({
    to,
    channel: 'sms',
  });
}

/**
 * Verifies the OTP entered by the user.
 * Returns true if the code is correct and not expired.
 */
export async function verifyOtpSms(to: string, code: string): Promise<boolean> {
  const client = getClient();
  try {
    const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
      to,
      code,
    });
    return check.status === 'approved';
  } catch {
    return false;
  }
}
