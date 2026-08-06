import { Router } from 'express';
import * as z from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import * as userService from '../services/userService.js';
import { createToken } from '../services/token.js';

const router = Router();

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'password is required'),
});

// POST /auth/register
router.post('/register', async (req, res, next) => {
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
router.post('/login', async (req, res, next) => {
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

    const token = await createToken(user.id);
    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

export default router;
