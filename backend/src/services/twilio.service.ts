import twilio from 'twilio';

/**
 * Lazy-initialize the Twilio client from environment variables.
 * Credentials are read strictly from process.env without hardcoding.
 */
function getTwilioClient() {
  const accountSid = process.env['TWILIO_ACCOUNT_SID'];
  const authToken = process.env['TWILIO_AUTH_TOKEN'];

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) are missing in environment.');
  }

  return twilio(accountSid, authToken);
}

function getVerifyServiceSid(): string {
  const serviceSid = process.env['TWILIO_VERIFY_SERVICE_SID'];
  if (!serviceSid) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID is missing in environment.');
  }
  return serviceSid;
}

/**
 * E.164 format regex: + followed by 1 to 15 digits (e.g. +919876543210, +14155552671, +447700900123, +971501234567)
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

/**
 * Sends a 6-digit OTP to the phone number using Twilio Verify API v2.
 * @param phoneNumber - E.164 formatted phone number string (e.g. +447700900123)
 */
export async function sendOTP(phoneNumber: string) {
  const formattedPhone = phoneNumber.trim();

  if (!isValidE164(formattedPhone)) {
    const err = new Error('Invalid phone number format. Must be in E.164 format (e.g. +919876543210 or +447700900123).');
    (err as any).statusCode = 400;
    throw err;
  }

  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();

  try {
    console.log(`[Twilio Verify] Dispatching SMS OTP to ${formattedPhone} using Service SID: ${serviceSid}...`);

    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: formattedPhone,
        channel: 'sms',
      });

    console.log(`[Twilio Verify] Success: Status=${verification.status}, SID=${verification.sid}`);
    return verification;
  } catch (err: any) {
    // Detailed Server Logging for Debugging
    console.error('❌ [Twilio Verify API Error Details]:', {
      httpStatus: err?.status,
      twilioErrorCode: err?.code,
      twilioErrorMessage: err?.message,
      verifyServiceSid: serviceSid,
      targetPhone: formattedPhone,
      moreInfo: err?.moreInfo,
    });

    const error = new Error(err?.message || 'Twilio Verify SMS dispatch failed.');
    (error as any).statusCode = err?.status && err.status >= 400 && err.status < 500 ? 400 : (err?.status || 500);
    (error as any).code = err?.code;
    throw error;
  }
}

/**
 * Verifies an OTP code against Twilio Verify API v2.
 * @param phoneNumber - E.164 formatted phone number
 * @param otp - 6-digit numeric OTP code
 */
export async function verifyOTP(phoneNumber: string, otp: string) {
  const formattedPhone = phoneNumber.trim();
  const trimmedOtp = otp.trim();

  if (!isValidE164(formattedPhone)) {
    const err = new Error('Invalid phone number format. Must be E.164.');
    (err as any).statusCode = 400;
    throw err;
  }

  if (!/^\d{4,8}$/.test(trimmedOtp)) {
    const err = new Error('Invalid OTP format. OTP must be a numeric code.');
    (err as any).statusCode = 400;
    throw err;
  }

  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();

  try {
    console.log(`[Twilio Verify] Verification Check for ${formattedPhone} with SID ${serviceSid}...`);

    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: formattedPhone,
        code: trimmedOtp,
      });

    console.log(`[Twilio Verify] Verification Result: Status=${check.status}`);
    return check;
  } catch (err: any) {
    console.error('❌ [Twilio Verify Check API Error Details]:', {
      httpStatus: err?.status,
      twilioErrorCode: err?.code,
      twilioErrorMessage: err?.message,
      verifyServiceSid: serviceSid,
      targetPhone: formattedPhone,
    });

    const error = new Error(err?.message || 'Twilio Verify OTP check failed.');
    (error as any).statusCode = err?.status && err.status >= 400 && err.status < 500 ? 400 : (err?.status || 500);
    (error as any).code = err?.code;
    throw error;
  }
}

// Backward compatibility aliases
export const sendTwilioOTP = sendOTP;
export const verifyTwilioOTP = verifyOTP;
