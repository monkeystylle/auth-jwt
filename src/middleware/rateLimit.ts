import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

/** Tight. Per (network, account) pair. Stops brute force on one account. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: req => {
    const ip = ipKeyGenerator(req.ip ?? '');
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'no-email';
    return `${ip}:${email}`;
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

/** Loose. Per network, all accounts. Stops spraying across many accounts. */
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this network.' },
});
