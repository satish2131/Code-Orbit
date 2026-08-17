import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

export const schemas = {
  signup: z.object({
    email: z.string().email('Invalid email format').max(254),
    username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  }),

  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),

  createSession: z.object({
    languagePreset: z.string().min(1, 'Language is required'),
    approvalMode: z.enum(['open', 'approval_required']),
    maxParticipants: z.number().int().min(2).max(6),
  }),

  joinSession: z.object({
    code: z.string().length(6, 'Session code must be 6 characters'),
    guestName: z.string().min(2).max(50).optional(),
  }),

  sendMessage: z.object({
    text: z.string().min(1, 'Message cannot be empty').max(1000),
  }),

  runCode: z.object({
    language: z.string().min(1),
    code: z.string().max(100000),
    stdin: z.string().max(10000).optional(),
  }),
};
