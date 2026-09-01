import 'dotenv/config';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3006';

type Email = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Dev transport: prints to the console instead of sending.
 * Replaced with a real provider in step 5.
 */
async function send(email: Email) {
  console.log('\n--- EMAIL ---');
  console.log('to:     ', email.to);
  console.log('subject:', email.subject);
  console.log(
    email.html
      .replace(/<\/p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .trim(),
  );
  console.log('-------------\n');
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
