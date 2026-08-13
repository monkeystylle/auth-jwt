import 'dotenv/config';
import { randomBytes, createHash } from 'node:crypto';
import { SignJWT } from 'jose';

const secretString = process.env.JWT_SECRET;
if (!secretString) {
  throw new Error('JWT_SECRET is not set');
}
const secret = new TextEncoder().encode(secretString);

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

/** Short-lived JWT. Sent on every request. Never stored server-side. */
export async function createAccessToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
}

/** Deterministic hash — same input always gives the same output. */
export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Long-lived opaque token.
 * Returns the plaintext (goes to the client, we never keep it),
 * the hash (goes in the DB), and when it dies.
 */
export function createRefreshToken() {
  const token = randomBytes(32).toString('base64url');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  return { token, tokenHash: hashRefreshToken(token), expiresAt };
}
