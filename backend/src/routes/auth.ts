import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma } from '@prisma/client';
import { validate, schemas } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';
import { usernameCheckLimiter } from '../middleware/rateLimiter';
import crypto from 'crypto';
import { validateUsernameRules } from '../utils/usernameValidation';
import {
  sendWelcomeEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetConfirmationEmail,
} from '../services/emailService';

const router = Router();

const hashIp = (ip?: string) => {
  if (!ip) return 'anonymous';
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 12);
};

const getRequestId = (req: Request) => {
  return (req.headers['x-request-id'] as string) || (req as any).requestId || `req_${crypto.randomBytes(8).toString('hex')}`;
};

const logAuditEvent = (req: Request, event: string, meta: Record<string, any> = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId: getRequestId(req),
    event,
    ...meta,
  }));
};

router.get('/check-username', usernameCheckLimiter, async (req: Request, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const rawUsername = req.query.username as string;

    const validation = validateUsernameRules(rawUsername);
    if (!validation.isValid) {
      if (validation.reason === 'reserved') {
        logAuditEvent(req, 'username_reserved_check', { ipHash: hashIp(req.ip), reason: validation.reason });
      }
      return res.json({
        available: false,
        reason: validation.reason,
        message: validation.error,
      });
    }

    const normalized = validation.normalized!;
    const existing = await prisma.user.findUnique({ where: { username: normalized } });

    if (existing) {
      return res.json({
        available: false,
        reason: 'taken',
        message: 'Username is already taken',
      });
    }

    return res.json({
      available: true,
      reason: 'available',
      message: 'Username is available',
    });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ available: false, reason: 'invalid', message: 'Server error checking username' });
  }
});

router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const username = String(req.query.username || '').trim().toLowerCase();

    const whereClause: any = {
      id: { not: req.userId },
    };

    if (username.length > 0) {
      whereClause.OR = [
        { username: { contains: username, mode: 'insensitive' } },
        { name: { contains: username, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
      },
      take: 20,
      orderBy: { username: 'asc' },
    });

    return res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ message: 'Failed to search users' });
  }
});

router.post('/signup', validate(schemas.signup), async (req: Request, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const { email, username, password, name } = req.body;

    const validation = validateUsernameRules(username);
    if (!validation.isValid) {
      logAuditEvent(req, 'username_invalid_signup', { ipHash: hashIp(req.ip), reason: validation.reason });
      return res.status(400).json({ message: validation.error, reason: validation.reason });
    }

    const normalizedUsername = validation.normalized!;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (existingUsername) {
      logAuditEvent(req, 'username_duplicate_signup', { ipHash: hashIp(req.ip), reason: 'taken' });
      return res.status(409).json({ message: 'Username is already taken', reason: 'taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username: normalizedUsername,
        password: hashedPassword,
        name,
        authProvider: 'email',
      },
    });

    logAuditEvent(req, 'user_created', { userId: user.id, ipHash: hashIp(req.ip) });

    if (user.email) {
      sendWelcomeEmail({
        email: user.email,
        name: user.name || user.username,
        username: user.username,
      }).catch((mailErr) => {
        console.warn('Could not send welcome email:', mailErr?.message);
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique constraint failed
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('username')) {
          logAuditEvent(req, 'username_p2002_conflict', { ipHash: hashIp(req.ip), reason: 'taken' });
          return res.status(409).json({ message: 'Username is already taken', reason: 'taken' });
        }
      }
    }
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

router.post('/login', validate(schemas.login), async (req: Request, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Failed to login' });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        authProvider: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        ...user,
        avatar_url: user.avatarUrl,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const { name } = req.body;
    const avatarToSave = req.body.avatarUrl !== undefined ? req.body.avatarUrl : req.body.avatar_url;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(avatarToSave !== undefined ? { avatarUrl: avatarToSave } : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        authProvider: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      user: {
        ...user,
        avatar_url: user.avatarUrl,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user profile' });
  }
});

// Request password reset OTP
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const redis = req.app.get('redis') as any;
    const rawEmail = String(req.body.email || '').trim().toLowerCase();

    if (!rawEmail || !rawEmail.includes('@')) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (!user) {
      // Return safe, uniform response to prevent account enumeration
      return res.json({
        success: true,
        message: 'If an account exists for this email, a 6-digit verification code has been sent.',
      });
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpKey = `pwd_otp:${rawEmail}`;
    const attemptKey = `pwd_attempts:${rawEmail}`;

    // Reset attempt counter and store OTP with 10-minute expiry (600s)
    if (redis?.setex) {
      await redis.setex(otpKey, 600, otp);
      await redis.del(attemptKey);
    }

    // Send email via Nodemailer
    await sendPasswordResetOtpEmail({
      email: rawEmail,
      name: user.name || user.username,
      otp,
      expiresInMinutes: 10,
    });

    logAuditEvent(req, 'password_reset_otp_requested', { email: rawEmail });

    return res.json({
      success: true,
      message: 'If an account exists for this email, a 6-digit verification code has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to process password reset. Please try again.' });
  }
});

// Verify password reset OTP
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const redis = req.app.get('redis') as any;
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const rawOtp = String(req.body.otp || '').trim();

    if (!rawEmail || !rawOtp) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    const otpKey = `pwd_otp:${rawEmail}`;
    const attemptKey = `pwd_attempts:${rawEmail}`;
    const storedOtp = redis?.get ? await redis.get(otpKey) : null;

    if (!storedOtp) {
      return res.status(400).json({
        message: 'Verification code has expired or is invalid. Please request a new one.',
      });
    }

    // Check failed attempts (limit: 5 attempts max)
    const attempts = parseInt((redis?.get ? await redis.get(attemptKey) : '0') || '0', 10) + 1;

    if (attempts > 5) {
      if (redis?.del) {
        await redis.del(otpKey);
        await redis.del(attemptKey);
      }
      return res.status(429).json({
        message: 'Too many invalid attempts. For your security, this code has been cancelled. Please request a new code.',
      });
    }

    if (storedOtp !== rawOtp) {
      if (redis?.setex) {
        await redis.setex(attemptKey, 600, String(attempts));
      }
      const remaining = 5 - attempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Code will be locked.'}`,
      });
    }

    return res.json({ success: true, valid: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Failed to verify code.' });
  }
});

// Complete password reset with new password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const redis = req.app.get('redis') as any;
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const rawOtp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!rawEmail || !rawOtp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const otpKey = `pwd_otp:${rawEmail}`;
    const attemptKey = `pwd_attempts:${rawEmail}`;
    const storedOtp = redis?.get ? await redis.get(otpKey) : null;

    if (!storedOtp || storedOtp !== rawOtp) {
      return res.status(400).json({
        message: 'Invalid or expired verification code. Please request a new code.',
      });
    }

    const user = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate OTP and attempts immediately
    if (redis?.del) {
      await redis.del(otpKey);
      await redis.del(attemptKey);
    }

    // Send confirmation email asynchronously
    sendPasswordResetConfirmationEmail({
      email: user.email!,
      name: user.name || user.username,
    }).catch(() => {});

    logAuditEvent(req, 'password_reset_completed', { userId: user.id, email: rawEmail });

    return res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});

export default router;

