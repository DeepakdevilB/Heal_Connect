
import * as dotenv from 'dotenv';
dotenv.config();

import { sendOtpSms } from './lib/sms';

async function run() {
  const phone = '+919876543210'; 
  console.log('Testing MSG91 (via sendOtpSms)...');
  try {
    await sendOtpSms(phone);
    console.log('MSG91 call succeeded!');
  } catch (err) {
    console.error('MSG91 call failed:', err);
  }
}

run();

