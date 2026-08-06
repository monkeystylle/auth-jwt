import 'dotenv/config';
import { SignJWT } from 'jose';

const secretString = process.env.JWT_SECRET;
if (!secretString) {
  throw new Error('JWT_SECRET is not set');
}
const secret = new TextEncoder().encode(secretString);

export async function createToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}
