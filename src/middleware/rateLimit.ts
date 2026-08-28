import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../redis.js';

type RedisReply = number | string | (number | string)[];

const sendCommand = (command: string, ...args: string[]) =>
  redis.call(command, ...args) as Promise<RedisReply>;

/** Tight. Per (network, account) pair. Stops brute force on one account. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:login:',
  }),
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
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:login-ip:',
  }),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this network.' },
});

/** For routes behind `authenticate`. Keyed by user, not network. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:api:',
  }),
  keyGenerator: req => {
    if (req.userId) return `user:${req.userId}`;
    return ipKeyGenerator(req.ip ?? '');
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

/** Catch-all. Loose. Runs before everything. */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:global:',
  }),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: req => req.path === '/healthcheck',
  message: { error: 'Too many requests, please slow down.' },
});

/** Registration. Stops account spam and email enumeration. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:register:',
  }),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network.' },
});

/** Refresh. Capacity protection — each attempt costs a DB query. */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:refresh:',
  }),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts.' },
});
