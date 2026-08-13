import { createRefreshToken } from '../services/token.js';
import {
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
} from '../services/refreshTokenService.js';
import { prisma } from '../prisma.js';

// Grab any existing user — you registered some via Postman
const user = await prisma.user.findFirst();
if (!user) throw new Error('No users in DB — register one first');
console.log('using user:', user.email);

// 1. Issue and store
const { token, tokenHash, expiresAt } = createRefreshToken();
const row = await storeRefreshToken(user.id, tokenHash, expiresAt);
console.log('stored row id:', row.id, '| revokedAt:', row.revokedAt);

// 2. Find it again using only the plaintext
const found = await findRefreshToken(token);
console.log('found by plaintext:', found?.id === row.id);

// 3. A token we never stored finds nothing
const stranger = createRefreshToken();
console.log(
  'unknown token found:',
  (await findRefreshToken(stranger.token)) !== null,
);

// 4. Revoke it
const revoked = await revokeRefreshToken(row.id);
console.log('revokedAt after revoke:', revoked.revokedAt);

await prisma.$disconnect();
