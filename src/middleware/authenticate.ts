import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

const secretString = process.env.JWT_SECRET;
if (!secretString) {
  throw new Error('JWT_SECRET is not set');
}
const secret = new TextEncoder().encode(secretString);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // remove "Bearer "

  try {
    const { payload } = await jwtVerify(token, secret);
    req.userId = payload.userId as number;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
