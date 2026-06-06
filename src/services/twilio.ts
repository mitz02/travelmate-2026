import twilio from 'twilio';
import { config } from '../config/index.js';
import dotenv from 'dotenv';

let client: twilio.Twilio | null = null;
let isInitialized = false;

function getClient() {
  if (!isInitialized) {
    // Force reload .env in case the server was not restarted
    dotenv.config();
    
    // Read directly from process.env to get the freshest values
    const sid = process.env.TWILIO_ACCOUNT_SID || config.twilio.accountSid;
    const token = process.env.TWILIO_AUTH_TOKEN || config.twilio.authToken;
    
    if (sid && token) {
      client = twilio(sid, token);
    } else {
      console.warn('⚠️ Twilio credentials missing. SMS OTP will not be sent.');
    }
    isInitialized = true;
  }
  return client;
}

/**
 * Sends an SMS message using Twilio.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const activeClient = getClient();
  
  if (!activeClient) {
    console.log(`[SIMULATED SMS to ${to}]: ${body}`);
    return;
  }

  try {
    await activeClient.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER || config.twilio.fromNumber,
      to,
    });
    console.log(`[DEBUG] SMS sent successfully to ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send SMS to ${to}:`, error);
    throw new Error('Failed to send SMS');
  }
}
