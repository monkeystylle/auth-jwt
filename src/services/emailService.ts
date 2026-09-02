import 'dotenv/config';
import { Resend } from 'resend';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

const APP_URL = process.env.APP_URL ?? 'http://localhost:3006';
const apiKey = requireEnv('RESEND_API_KEY');
const from = requireEnv('EMAIL_FROM');

const resend = new Resend(apiKey);

type Email = {
  to: string;
  subject: string;
  html: string;
};

async function send(email: Email) {
  const { data, error } = await resend.emails.send({
    from,
    to: email.to,
    subject: email.subject,
    html: email.html,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  console.log('email sent:', data?.id, '->', email.to);
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_URL}/auth/verify-email?token=${token}`;

  await send({
    to,
    subject: 'Verify your email',
    html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${APP_URL}/auth/reset-password?token=${token}`;

  await send({
    to,
    subject: 'Reset your password',
    html: `<p>Click to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>`,
  });
}
