import { prisma } from '../prisma.js';
import { hashRefreshToken } from './token.js';

/** Save a newly-issued refresh token. Only the hash is stored. */
export function storeRefreshToken(
  userId: number,
  tokenHash: string,
  expiresAt: Date,
) {
  return prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

/** Look up a token by its plaintext value. Returns the row or null. */
export function findRefreshToken(token: string) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
  });
}

/** Mark one token dead. Used on logout and on rotation. */
export function revokeRefreshToken(id: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

/** Mark every one of a user's tokens dead. Logout-everywhere, or panic button. */
export function revokeAllUserTokens(userId: number) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
