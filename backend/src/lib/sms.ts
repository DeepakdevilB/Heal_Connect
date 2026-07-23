/**
 * sms.ts — Unified OTP service
 *
 * Routing logic:
 *   +91 (India)      → MSG91 OTP API
 *   All other codes  → Twilio Verify
 *
 * Both providers are configured exclusively via environment variables.
 * No credentials are hardcoded here.
 */

import twilio from 'twilio';

// ─── Twilio config ────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID        = process.env['TWILIO_ACCOUNT_SID']        ?? '';
const TWILIO_AUTH_TOKEN         = process.env['TWILIO_AUTH_TOKEN']         ?? '';
const TWILIO_VERIFY_SERVICE_SID = process.env['TWILIO_VERIFY_SERVICE_SID'] ?? '';

/** Returns true if Twilio Verify is fully configured. */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID);
}

function getTwilioClient() {
  if (!isTwilioConfigured()) throw new Error('Twilio is not configured.');
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// ─── MSG91 config ─────────────────────────────────────────────────────────────

const MSG91_AUTH_KEY   = process.env['MSG91_AUTH_KEY']   ?? '';
const MSG91_TEMPLATE_ID = process.env['MSG91_TEMPLATE_ID'] ?? '';

/** Returns true if MSG91 is fully configured. */
export function isMsg91Configured(): boolean {
  return !!(MSG91_AUTH_KEY && MSG91_TEMPLATE_ID);
}

// ─── Provider selector ────────────────────────────────────────────────────────

/**
 * Returns which SMS provider should handle the given phone number.
 * Indian numbers (+91…) use MSG91; everything else uses Twilio Verify.
 */
function selectProvider(phone: string): 'msg91' | 'twilio' {
  // E.164 format: +91XXXXXXXXXX
  return phone.startsWith('+91') ? 'msg91' : 'twilio';
}

// ─── MSG91 helpers ────────────────────────────────────────────────────────────

/**
 * Sends an OTP to an Indian phone number via MSG91.
 * MSG91 generates, delivers, and tracks expiry automatically.
 *
 * Docs: https://docs.msg91.com/reference/send-otp
 */
async function sendOtpMsg91(phone: string): Promise<void> {
  if (!isMsg91Configured()) {
    throw new Error('MSG91 is not configured. Set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID.');
  }

  // MSG91 expects the number without the leading '+' sign
  const mobile = phone.replace(/^\+/, '');

  const url = 'https://control.msg91.com/api/v5/otp';
  const params = new URLSearchParams({
    template_id: MSG91_TEMPLATE_ID,
    mobile,
    authkey: MSG91_AUTH_KEY,
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MSG91 sendOtp failed [${response.status}]: ${body}`);
  }

  const data = (await response.json()) as { type?: string; message?: string };
  if (data.type !== 'success') {
    throw new Error(`MSG91 sendOtp error: ${data.message ?? JSON.stringify(data)}`);
  }
}

/**
 * Verifies an OTP for an Indian phone number via MSG91.
 * Returns true if the code is correct and not expired.
 *
 * Docs: https://docs.msg91.com/reference/verify-otp
 */
async function verifyOtpMsg91(phone: string, code: string): Promise<boolean> {
  if (!isMsg91Configured()) return false;

  const mobile = phone.replace(/^\+/, '');

  const url = 'https://control.msg91.com/api/v5/otp/verify';
  const params = new URLSearchParams({
    mobile,
    otp: code,
    authkey: MSG91_AUTH_KEY,
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    const data = (await response.json()) as { type?: string };
    return data.type === 'success';
  } catch (err) {
    console.error('MSG91 verifyOtp error:', err);
    return false;
  }
}

// ─── Twilio helpers ───────────────────────────────────────────────────────────

/**
 * Sends an OTP via Twilio Verify.
 * Twilio handles generation, delivery, and expiry automatically.
 */
async function sendOtpTwilio(phone: string): Promise<void> {
  const client = getTwilioClient();
  await client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verifications.create({
    to: phone,
    channel: 'sms',
  });
}

/**
 * Verifies an OTP via Twilio Verify.
 * Returns true if the code is correct and not expired.
 */
async function verifyOtpTwilio(phone: string, code: string): Promise<boolean> {
  const client = getTwilioClient();
  try {
    const check = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });
    return check.status === 'approved';
  } catch {
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends an OTP to the given E.164 phone number.
 * Automatically routes to MSG91 (+91) or Twilio Verify (all others).
 *
 * @param phone - E.164 formatted phone number, e.g. "+919876543210" or "+12025551234"
 */
export async function sendOtpSms(phone: string): Promise<void> {
  const provider = selectProvider(phone);

  if (provider === 'msg91') {
    await sendOtpMsg91(phone);
  } else {
    await sendOtpTwilio(phone);
  }
}

/**
 * Verifies the OTP entered by the user.
 * Automatically routes to MSG91 (+91) or Twilio Verify (all others).
 * Returns true if the code is correct and not expired.
 *
 * @param phone - E.164 formatted phone number
 * @param code  - The 6-digit OTP entered by the user
 */
export async function verifyOtpSms(phone: string, code: string): Promise<boolean> {
  const provider = selectProvider(phone);

  if (provider === 'msg91') {
    return verifyOtpMsg91(phone, code);
  } else {
    return verifyOtpTwilio(phone, code);
  }
}

/**
 * Returns true if the OTP service is configured for the given phone number.
 * Used by routes to return a clear 503 instead of a cryptic 500.
 */
export function isOtpConfigured(phone: string): boolean {
  const provider = selectProvider(phone);
  return provider === 'msg91' ? isMsg91Configured() : isTwilioConfigured();
}
