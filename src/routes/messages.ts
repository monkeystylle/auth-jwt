import { Router } from 'express';
import * as z from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import * as messageService from '../services/messageService.js';

const router = Router();

const messageSchema = z.object({
  text: z.string().min(1, 'text is required'),
});

const idSchema = z.coerce.number().int().positive();

// GET /messages
router.get('/', async (req, res) => {
  const messages = await messageService.getAllMessages(req.userId!);
  res.status(200).json(messages);
});

// POST /messages
router.post('/', async (req, res) => {
  const result = messageSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  const newMessage = await messageService.createMessage(
    result.data.text,
    req.userId!,
  );

  res.status(201).json(newMessage);
});

// GET /messages/:id
router.get('/:id', async (req, res) => {
  const result = idSchema.safeParse(req.params.id);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const message = await messageService.getMessageById(result.data, req.userId!);
  if (!message) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  res.status(200).json(message);
});

// PUT /messages/:id
router.put('/:id', async (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const bodyResult = messageSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: bodyResult.error.issues });
    return;
  }

  const result = await messageService.updateMessage(
    idResult.data,
    bodyResult.data.text,
    req.userId!,
  );

  if (result.count === 0) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.status(200).json({ message: 'Message updated' });
});

// DELETE /messages/:id
router.delete('/:id', async (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const result = await messageService.deleteMessage(idResult.data, req.userId!);

  if (result.count === 0) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.status(200).json({ message: 'Message deleted' });
});

export default router;
