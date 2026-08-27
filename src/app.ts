import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import authRouter from './routes/auth.js';
import messagesRouter from './routes/messages.js';
import { authenticate } from './middleware/authenticate.js';

const app = express();

app.use(express.json());

app.get('/healthcheck', (_req, res) => {
  res.status(200).json({ message: 'API is up and running!' });
});

app.get('/debug/ip', (req, res) => {
  res.json({
    ip: req.ip,
    xForwardedFor: req.headers['x-forwarded-for'],
    trustProxy: app.get('trust proxy'),
  });
});

app.use('/auth', authRouter);
app.use('/messages', authenticate, messagesRouter);

// Central error handler (must be LAST)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = Number(process.env.PORT) || 3006;

app.listen(PORT, () => {
  console.log(`Auth server is running on http://localhost:${PORT}`);
});
