import { prisma } from '../prisma.js';

export function getAllMessages(userId: number) {
  return prisma.message.findMany({ where: { userId } });
}

export function getMessageById(id: number, userId: number) {
  return prisma.message.findFirst({ where: { id, userId } });
}

export function createMessage(text: string, userId: number) {
  return prisma.message.create({ data: { text, userId } });
}

export function updateMessage(id: number, text: string, userId: number) {
  return prisma.message.updateMany({
    where: { id, userId },
    data: { text },
  });
}

export function deleteMessage(id: number, userId: number) {
  return prisma.message.deleteMany({ where: { id, userId } });
}
