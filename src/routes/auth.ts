import { Router } from 'express';
import * as z from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import * as userService from '../services/userService.js';
import { createAccessToken, createRefreshToken } from '../services/token.js';
import {
  loginLimiter,
  loginIpLimiter,
  registerLimiter,
  refreshLimiter,
  tokenLimiter,
  emailSendIpLimiter,
  emailSendLimiter,
} from '../middleware/rateLimit.js';

import {
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  revokeIfActive,
} from '../services/refreshTokenService.js';
import { TokenType } from '../generated/prisma/client.js';
import {
  issueToken,
  consumeToken,
  invalidateTokens,
} from '../services/verificationTokenService.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';

const router = Router();

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

const tokenSchema = z.object({ token: z.string().min(1) });
const emailSchema = z.object({ email: z.email() });

// POST /auth/register
router.post('/register', registerLimiter, async (req, res, next) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  try {
    const user = await userService.createUser(
      result.data.email,
      result.data.password,
    );

    const token = await issueToken(user.id, TokenType.EMAIL_VERIFICATION);
    await sendVerificationEmail(user.email, token).catch(err =>
      console.error('verification email failed:', err),
    );

    res.status(201).json(user);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    next(err);
  }
});

// POST /auth/login
router.post('/login', loginIpLimiter, loginLimiter, async (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  try {
    const user = await userService.findUserByEmail(result.data.email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await userService.verifyPassword(
      user.password,
      result.data.password,
    );
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = await createAccessToken(user.id);

    const { token: refreshToken, tokenHash, expiresAt } = createRefreshToken();
    await storeRefreshToken(user.id, tokenHash, expiresAt);

    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', refreshLimiter, async (req, res, next) => {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  try {
    const stored = await findRefreshToken(result.data.refreshToken);

    if (!stored) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    if (stored.expiresAt < new Date()) {
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Atomic: revoke only if still alive. count === 0 means it was already dead.
    const revoked = await revokeIfActive(stored.id);

    if (revoked.count === 0) {
      await revokeAllUserTokens(stored.userId);
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const accessToken = await createAccessToken(stored.userId);
    const { token: refreshToken, tokenHash, expiresAt } = createRefreshToken();
    await storeRefreshToken(stored.userId, tokenHash, expiresAt);

    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post('/logout', async (req, res, next) => {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  try {
    const stored = await findRefreshToken(result.data.refreshToken);

    if (stored && !stored.revokedAt) {
      await revokeRefreshToken(stored.id);
    }

    res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// POST /auth/verify-email
router.post('/verify-email', tokenLimiter, async (req, res, next) => {
  const result = tokenSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  try {
    const userId = await consumeToken(
      result.data.token,
      TokenType.EMAIL_VERIFICATION,
    );

    if (!userId) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    await userService.markEmailVerified(userId);
    res.status(200).json({ message: 'Email verified' });
  } catch (err) {
    next(err);
  }
});

// POST /auth/resend-verification
router.post(
  '/resend-verification',
  emailSendIpLimiter,
  async (req, res, next) => {
    const result = emailSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    try {
      const user = await userService.findUserByEmail(result.data.email);

      if (user && !user.emailVerified) {
        await invalidateTokens(user.id, TokenType.EMAIL_VERIFICATION);
        const token = await issueToken(user.id, TokenType.EMAIL_VERIFICATION);
        await sendVerificationEmail(user.email, token).catch(err =>
          console.error('verification email failed:', err),
        );
      }

      res.status(200).json({
        message: 'If that account needs verification, an email has been sent.',
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/forgot-password
router.post(
  '/forgot-password',
  emailSendIpLimiter,
  emailSendLimiter,
  async (req, res, next) => {
    const result = emailSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    try {
      const user = await userService.findUserByEmail(result.data.email);

      if (user) {
        await invalidateTokens(user.id, TokenType.PASSWORD_RESET);
        const token = await issueToken(user.id, TokenType.PASSWORD_RESET);
        await sendPasswordResetEmail(user.email, token).catch(err =>
          console.error('reset email failed:', err),
        );
      }

      res.status(200).json({
        message: 'If that account exists, a reset link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/reset-password
router.post('/reset-password', tokenLimiter, async (req, res, next) => {
  const result = resetSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  try {
    const userId = await consumeToken(
      result.data.token,
      TokenType.PASSWORD_RESET,
    );

    if (!userId) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    await userService.updatePassword(userId, result.data.password);
    await revokeAllUserTokens(userId);

    res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
