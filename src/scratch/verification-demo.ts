import { prisma } from '../prisma.js';
import { TokenType } from '../generated/prisma/client.js';
import {
  issueToken,
  consumeToken,
  invalidateTokens,
} from '../services/verificationTokenService.js';

const user = await prisma.user.findFirst();
if (!user) throw new Error('No users in DB');
console.log('user:', user.email);

// 1. Issue and consume
const t1 = await issueToken(user.id, TokenType.EMAIL_VERIFICATION);
console.log(
  'consume  ->',
  await consumeToken(t1, TokenType.EMAIL_VERIFICATION),
  '(expect',
  user.id + ')',
);

// 2. Second use is rejected
console.log(
  'reuse    ->',
  await consumeToken(t1, TokenType.EMAIL_VERIFICATION),
  '(expect null)',
);

// 3. Wrong type is rejected
const t2 = await issueToken(user.id, TokenType.EMAIL_VERIFICATION);
console.log(
  'wrongtype->',
  await consumeToken(t2, TokenType.PASSWORD_RESET),
  '(expect null)',
);
console.log(
  'righttype->',
  await consumeToken(t2, TokenType.EMAIL_VERIFICATION),
  '(expect',
  user.id + ')',
);

// 4. Unknown token is rejected
console.log(
  'unknown  ->',
  await consumeToken('not-a-real-token', TokenType.EMAIL_VERIFICATION),
  '(expect null)',
);

// 5. The race — two concurrent consumes, exactly one wins
const t3 = await issueToken(user.id, TokenType.EMAIL_VERIFICATION);
const [a, b] = await Promise.all([
  consumeToken(t3, TokenType.EMAIL_VERIFICATION),
  consumeToken(t3, TokenType.EMAIL_VERIFICATION),
]);
console.log('race     ->', a, b, '(expect exactly one null)');

// 6. Invalidate outstanding
await issueToken(user.id, TokenType.PASSWORD_RESET);
await issueToken(user.id, TokenType.PASSWORD_RESET);
const killed = await invalidateTokens(user.id, TokenType.PASSWORD_RESET);
console.log('killed   ->', killed.count, '(expect 2)');

await prisma.$disconnect();
