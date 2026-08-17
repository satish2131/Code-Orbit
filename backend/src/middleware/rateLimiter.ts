import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export const usernameCheckLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 10; // Max 10 requests per minute

  if (!store[ip] || now > store[ip].resetTime) {
    store[ip] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return next();
  }

  store[ip].count += 1;

  if (store[ip].count > maxRequests) {
    console.warn(`[Security Audit] Rate limit exceeded for username checks from IP: ${ip}`);
    return res.status(429).json({
      available: false,
      reason: 'invalid',
      message: 'Too many requests. Please wait a minute before checking again.',
    });
  }

  next();
};
