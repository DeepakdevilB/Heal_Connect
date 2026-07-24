import twilio from 'twilio';

// Lazy-initialize the client so it's only created when first used,
// by which point dotenv has already loaded the environment variables.
function getClient() {
  return twilio(
    process.env['TWILIO_ACCOUNT_SID']!,
    process.env['TWILIO_AUTH_TOKEN']!
  );
}

export async function sendTwilioOTP(phone: string) {
  return getClient().verify.v2
    .services(process.env['TWILIO_VERIFY_SERVICE_SID']!)
    .verifications.create({
      to: phone,
      channel: 'sms',
    });
}

export async function verifyTwilioOTP(phone: string, otp: string) {
  return getClient().verify.v2
    .services(process.env['TWILIO_VERIFY_SERVICE_SID']!)
    .verificationChecks.create({
      to: phone,
      code: otp,
    });
}
