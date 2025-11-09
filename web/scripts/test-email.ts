#!/usr/bin/env tsx

/**
 * Script to test email service configuration
 *
 * Usage:
 *   npm run test:email <email>
 *   tsx scripts/test-email.ts <email>
 *
 * Example:
 *   tsx scripts/test-email.ts test@example.com
 */

import { sendMagicLink, testEmailConnection } from '../lib/email/mailer';
import crypto from 'crypto';

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('❌ Error: Please provide an email address');
  console.log('Usage: tsx scripts/test-email.ts <email>');
  process.exit(1);
}

async function testEmail() {
  console.log('🔧 Testing email service...\n');

  // Test 1: Check connection
  console.log('Test 1: Checking email service connection...');
  const isConnected = await testEmailConnection();

  if (isConnected) {
    console.log('✅ Email service is connected');

    const isProduction = process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY;
    console.log(`📧 Using: ${isProduction ? 'Resend (Production)' : 'Nodemailer + MailHog (Development)'}`);
  } else {
    console.log('❌ Email service connection failed');
    console.log('\nTroubleshooting:');
    console.log('- Make sure MailHog is running (for development): mailhog');
    console.log('- Check that SMTP_HOST and SMTP_PORT are set in .env.local');
    console.log('- For production, ensure RESEND_API_KEY is set');
    process.exit(1);
  }
  console.log('');

  // Test 2: Send test magic link
  console.log('Test 2: Sending test magic link email...');
  try {
    const testToken = crypto.randomBytes(32).toString('hex');
    await sendMagicLink(targetEmail, testToken, 'Test User');

    console.log(`✅ Email sent successfully to ${targetEmail}`);
    console.log('');

    if (process.env.NODE_ENV !== 'production') {
      console.log('📬 Check MailHog to view the email:');
      console.log('   http://localhost:8025');
    } else {
      console.log('📬 Check your email inbox');
      console.log('   (Also check spam folder)');
    }
    console.log('');
    console.log('Test completed successfully! ✨');
  } catch (error) {
    console.error('❌ Failed to send email');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

testEmail()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
