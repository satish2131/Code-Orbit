import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { validate, schemas } from '../middleware/validation';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { flushSessionWrites } from '../services/bufferService';
import { INACTIVITY_TIMEOUT_SECONDS, INACTIVITY_TIMEOUT_MS } from '../services/sessionCleanupService';

const router = Router();

router.post('/', authenticate, validate(schemas.createSession), async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const redis = req.app.get('redis') as Redis;
    const { languagePreset, approvalMode, maxParticipants } = req.body;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const session = await prisma.session.create({
      data: {
        code,
        hostId: req.userId!,
        languagePreset,
        approvalMode,
        maxParticipants,
        status: 'waiting',
      },
    });

    await prisma.participant.create({
      data: {
        sessionId: session.id,
        userId: req.userId,
        role: 'host',
        status: 'active',
      },
    });

    const LANGUAGE_FILE_MAP: Record<string, { files: string[]; language: string }> = {
      web:        { files: ['index.html', 'style.css', 'script.js'], language: 'web' },
      python:     { files: ['main.py'],        language: 'python' },
      javascript: { files: ['index.js'],       language: 'javascript' },
      typescript: { files: ['index.ts'],       language: 'typescript' },
      java:       { files: ['Main.java'],      language: 'java' },
      cpp:        { files: ['main.cpp'],       language: 'cpp' },
      c:          { files: ['main.c'],         language: 'c' },
      go:         { files: ['main.go'],        language: 'go' },
      rust:       { files: ['main.rs'],        language: 'rust' },
      php:        { files: ['index.php'],      language: 'php' },
      ruby:       { files: ['main.rb'],        language: 'ruby' },
      swift:      { files: ['main.swift'],     language: 'swift' },
      kotlin:     { files: ['Main.kt'],        language: 'kotlin' },
      csharp:     { files: ['Program.cs'],     language: 'csharp' },
    };

    const presetConfig = LANGUAGE_FILE_MAP[languagePreset] ?? {
      files: [`main.${languagePreset}`],
      language: languagePreset,
    };

    for (let i = 0; i < presetConfig.files.length; i++) {
      await prisma.fileTab.create({
        data: {
          sessionId: session.id,
          filename: presetConfig.files[i],
          language: presetConfig.language,
          content: '',
          orderIndex: i,
        },
      });
    }

    const SESSION_EXPIRY = INACTIVITY_TIMEOUT_SECONDS;
    await redis.setex(`session:${code}`, SESSION_EXPIRY, JSON.stringify({
      sessionId: session.id,
      hostId: req.userId,
    }));

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Failed to create session' });
  }
});

router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;

    const participants = await prisma.participant.findMany({
      where: {
        userId: req.userId,
        session: {
          status: { in: ['active', 'ended'] },
        },
      },
      include: {
        session: {
          include: {
            host: { select: { id: true, name: true, email: true } },
            participants: { select: { id: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 20,
    });

    const sessions = participants.map((p) => ({
      ...p.session,
      isHost: p.session.hostId === req.userId,
      participantCount: p.session.participants.length,
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Failed to get session history' });
  }
});

router.delete('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    await prisma.participant.deleteMany({
      where: {
        userId: req.userId,
      },
    });
    res.json({ success: true, message: 'All session history cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ message: 'Failed to clear session history' });
  }
});

router.delete('/history/:idOrCode', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const idOrCode = String(req.params.idOrCode);

    await prisma.participant.deleteMany({
      where: {
        userId: req.userId,
        OR: [
          { sessionId: idOrCode },
          { id: idOrCode },
          { session: { code: idOrCode } },
        ],
      },
    });

    res.json({ success: true, message: 'Session removed from history' });
  } catch (error) {
    console.error('Delete session history error:', error);
    res.status(500).json({ message: 'Failed to delete session record' });
  }
});

router.post('/:code/start', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const code = req.params.code as string;

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'waiting') {
      const updated = await prisma.session.update({
        where: { code },
        data: { status: 'active' },
      });
      return res.json({ session: updated });
    }

    res.json({ session });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Failed to start session' });
  }
});

router.get('/:code', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const code = req.params.code as string;

    const session = await prisma.session.findUnique({
      where: { code },
      include: {
        host: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          select: {
            id: true,
            guestName: true,
            role: true,
            status: true,
            joinedAt: true,
          },
        },
        fileTabs: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const isInactive =
      session.status !== 'ended' &&
      Date.now() - new Date((session as any).updatedAt || session.createdAt).getTime() > INACTIVITY_TIMEOUT_MS;

    if (isInactive) {
      const redis = req.app.get('redis') as Redis;
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'ended', endedAt: new Date() },
      });
      await redis.del(`session:${code}`);
      return res.status(400).json({ message: 'Session has ended due to 6 hours of inactivity' });
    }

    res.json({
      schemaVersion: 1,
      session,
      fileTabs: session.fileTabs,
      participants: session.participants,
      version: (session as any).version || 1,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Failed to get session' });
  }
});

router.post('/:code/join', optionalAuth, validate(schemas.joinSession), async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const redis = req.app.get('redis') as Redis;
    const code = req.params.code as string;
    const { guestName } = req.body;

    const sessionData = await redis.get(`session:${code}`);
    if (!sessionData) {
      return res.status(404).json({ message: 'Session not found or expired' });
    }

    const session = await prisma.session.findUnique({
      where: { code },
      include: {
        participants: {
          where: { status: { in: ['active', 'pending'] } },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const isInactive =
      session.status !== 'ended' &&
      Date.now() - new Date((session as any).updatedAt || session.createdAt).getTime() > INACTIVITY_TIMEOUT_MS;

    if (isInactive) {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'ended', endedAt: new Date() },
      });
      await redis.del(`session:${code}`);
      return res.status(400).json({ message: 'Session has ended due to 6 hours of inactivity' });
    }

    if (session.status === 'ended') {
      return res.status(400).json({ message: 'Session has ended' });
    }

    if (session.participants.length >= session.maxParticipants) {
      return res.status(400).json({ message: 'Session is full' });
    }

    // Idempotent join: re-use existing participant record if user already joined
    if (req.userId) {
      const existingParticipant = await prisma.participant.findFirst({
        where: { sessionId: session.id, userId: req.userId },
      });
      if (existingParticipant) {
        return res.json({ participant: existingParticipant, session });
      }
    }

    const participant = await prisma.participant.create({
      data: {
        sessionId: session.id,
        userId: req.userId || null,
        guestName: guestName || 'Participant',
        role: 'viewer',
        status: session.approvalMode === 'open' ? 'active' : 'pending',
      },
    });

    const io = req.app.get('io');
    io.to(code).emit('participant_joined', {
      id: participant.id,
      guestName: participant.guestName,
      role: participant.role,
      status: participant.status,
    });

    res.json({ participant, session });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ message: 'Failed to join session' });
  }
});

router.post('/:code/approve/:participantId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const code = req.params.code as string;
    const participantId = req.params.participantId as string;

    const session = await prisma.session.findUnique({
      where: { code },
      include: { host: true },
    });

    if (!session || session.hostId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const targetParticipant = await prisma.participant.findUnique({ where: { id: participantId } });
    if (!targetParticipant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    if (targetParticipant.status === 'active') {
      return res.json({ participant: targetParticipant });
    }

    const participant = await prisma.participant.update({
      where: { id: participantId },
      data: { status: 'active' },
    });

    const io = req.app.get('io');
    io.to(code).emit('participant_approved', {
      participantId: participant.id,
      guestName: participant.guestName,
      role: participant.role,
    });

    if (session.status === 'waiting') {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'active' },
      });
    }

    res.json({ participant });
  } catch (error) {
    console.error('Approve participant error:', error);
    res.status(500).json({ message: 'Failed to approve participant' });
  }
});

router.post('/:code/decline/:participantId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const code = req.params.code as string;
    const participantId = req.params.participantId as string;

    const session = await prisma.session.findUnique({
      where: { code },
      include: { host: true },
    });

    if (!session || session.hostId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.participant.delete({
      where: { id: participantId },
    });

    const io = req.app.get('io');
    io.to(code).emit('participant_declined', { participantId });

    res.json({ message: 'Participant declined' });
  } catch (error) {
    console.error('Decline participant error:', error);
    res.status(500).json({ message: 'Failed to decline participant' });
  }
});

router.post('/:code/end', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const redis = req.app.get('redis') as Redis;
    const code = req.params.code as string;

    const session = await prisma.session.findUnique({
      where: { code },
      include: { host: true },
    });

    if (!session || session.hostId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await flushSessionWrites(prisma, session.id);

    const finalStatus = session.status === 'active' ? 'ended' : 'cancelled';
    await prisma.session.update({
      where: { id: session.id },
      data: { status: finalStatus, endedAt: new Date() },
    });

    await redis.del(`session:${code}`);

    const io = req.app.get('io');
    io.to(code).emit('session_ended');

    res.json({ message: 'Session ended' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Failed to end session' });
  }
});

export default router;
