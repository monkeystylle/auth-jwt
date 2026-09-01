import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';

await sendVerificationEmail('test@example.com', 'fake-token-abc123');
await sendPasswordResetEmail('test@example.com', 'fake-token-xyz789');
