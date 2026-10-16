import type { Organization } from '../generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number };
      org?: Organization;
    }
  }
}

export {};
