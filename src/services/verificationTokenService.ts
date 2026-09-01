import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '../prisma.js';
import { TokenType } from '../generated/prisma/client.js';

const TTL_MINUTES: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 60 * 24, // 24 hours
  PASSWORD_RESET: 30, // 30 minutes
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a token and store only its hash.
 * Returns the plaintext — this is the ONLY time it exists. Email it, don't log it.
 */
export async function issueToken(userId: number, type: TokenType) {
  const token = randomBytes(32).toString('base64url');

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TTL_MINUTES[type]);

  await prisma.verificationToken.create({
    data: { userId, type, tokenHash: hashToken(token), expiresAt },
  });

  return token;
}

/**
 * Atomically consume a token.
 * Returns the userId on success, or null if the token is unknown,
 * wrong type, expired, or already used.
 */
export async function consumeToken(token: string, type: TokenType) {
  const row = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!row || row.type !== type || row.expiresAt < new Date()) {
    return null;
  }

  // Single conditional write. count === 0 means someone else consumed it first.
  const claimed = await prisma.verificationToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (claimed.count === 0) {
    return null;
  }

  return row.userId;
}

/** Kill a user's outstanding tokens of one type. Call before issuing a new one. */
export function invalidateTokens(userId: number, type: TokenType) {
  return prisma.verificationToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
}
