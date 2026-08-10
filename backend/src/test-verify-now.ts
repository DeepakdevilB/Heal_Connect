import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const accountSid = process.env['TWILIO_ACCOUNT_SID'];
const authToken = process.env['TWILIO_AUTH_TOKEN'];
const verifyServiceSid = process.env['TWILIO_VERIFY_SERVICE_SID'];

const testPhone = '+919878349038';

async function testOtpSendNow() {
  if (!accountSid || !authToken || !verifyServiceSid) {
    console.error('❌ Missing Twilio environment variables!');
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    console.log(`\n📲 Sending Twilio Verify OTP to ${testPhone}...`);
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: testPhone, channel: 'sms' });

    console.log('\n🎉 SUCCESS! TWILIO DISPATCHED THE OTP SMS!');
    console.log('-------------------------------------------');
    console.log('Target Phone:', verification.to);
    console.log('OTP Status:', verification.status);
    console.log('Verification SID:', verification.sid);
    console.log('-------------------------------------------');
  } catch (err: any) {
    console.error('\n❌ TWILIO ERROR DETAILS:');
    console.error('Message:', err?.message || err);
    if (err?.code) console.error('Error Code:', err.code);
    if (err?.status) console.error('HTTP Status:', err.status);
    if (err?.moreInfo) console.error('More Info:', err.moreInfo);
  }
}

testOtpSendNow();
