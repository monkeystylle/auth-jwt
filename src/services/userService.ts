import argon2 from 'argon2';
import { prisma } from '../prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: string, password: string) {
  const passwordHash = await argon2.hash(password);

  return prisma.user.create({
    data: { email, password: passwordHash },
    select: { id: true, email: true, createdAt: true },
  });
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
