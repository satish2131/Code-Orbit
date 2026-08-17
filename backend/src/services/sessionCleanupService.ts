import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { flushSessionWrites } from './bufferService';

// 6 Hours Inactivity Timeout in milliseconds
export const INACTIVITY_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 21,600,000 ms (6 hours)
export const INACTIVITY_TIMEOUT_SECONDS = 6 * 60 * 60; // 21,600 seconds

/**
 * Updates the last activity timestamp (updatedAt) of a session in PostgreSQL & Redis.
 */
export async function touchSessionActivity(
  prisma: PrismaClient,
  redis: Redis,
  sessionId: string,
  code: string
): Promise<void> {
  try {
    const now = new Date();
    await (prisma.session as any).update({
      where: { id: sessionId },
      data: { updatedAt: now },
    });

    const sessionDataStr = await redis.get(`session:${code}`);
    if (sessionDataStr) {
      await redis.setex(`session:${code}`, INACTIVITY_TIMEOUT_SECONDS, sessionDataStr);
    }
  } catch (err) {
    // Non-blocking catch to prevent socket operations from throwing if DB touches fail
    console.warn(`[SessionActivity] Failed to touch activity for session ${code}:`, err);
  }
}

/**
 * Checks all active/waiting sessions and ends any session inactive for more than 6 hours.
 */
export async function checkAndCleanInactiveSessions(
  io: Server,
  prisma: PrismaClient,
  redis: Redis
): Promise<number> {
  let count = 0;
  try {
    const cutoffTime = new Date(Date.now() - INACTIVITY_TIMEOUT_MS);

    // Find all non-ended sessions where updatedAt (or createdAt) is older than 6 hours
    const inactiveSessions: any[] = await (prisma.session as any).findMany({
      where: {
        status: { in: ['waiting', 'active'] },
        updatedAt: { lt: cutoffTime },
      },
      select: {
        id: true,
        code: true,
        updatedAt: true,
      },
    });

    for (const session of inactiveSessions) {
      try {
        const lastActiveDate = session.updatedAt ? new Date(session.updatedAt) : new Date();
        console.log(
          `[Auto Inactivity Cleanup] Session ${session.code} (ID: ${session.id}) inactive since ${lastActiveDate.toISOString()}. Auto-ending...`
        );

        // 1. Flush pending code buffer writes to DB
        await flushSessionWrites(prisma, session.id);

        // 2. Mark session as ended in PostgreSQL
        await prisma.session.update({
          where: { id: session.id },
          data: {
            status: 'ended',
            endedAt: new Date(),
          },
        });

        // 3. Remove cached session key in Redis
        await redis.del(`session:${session.code}`);

        // 4. Notify all connected client sockets that session has ended
        if (io) {
          io.to(session.code).emit('session_ended', {
            code: 'SESSION_AUTO_ENDED_INACTIVE',
            message: 'This room has automatically ended after 6 hours of inactivity.',
          });
        }

        count++;
      } catch (sessionErr) {
        console.error(`[Auto Inactivity Cleanup] Error ending session ${session.code}:`, sessionErr);
      }
    }
  } catch (err) {
    console.error('[Auto Inactivity Cleanup] Global cleanup task error:', err);
  }
  return count;
}

/**
 * Starts periodic background polling worker to auto-end inactive sessions every 5 minutes.
 */
export function startSessionCleanupTask(
  io: Server,
  prisma: PrismaClient,
  redis: Redis,
  intervalMs = 5 * 60 * 1000 // 5 minutes
): NodeJS.Timeout {
  console.log(`[Auto Cleanup Service] Initialized. Inactivity threshold: 6 hours (${INACTIVITY_TIMEOUT_SECONDS}s).`);

  // Run initial check immediately on server launch
  checkAndCleanInactiveSessions(io, prisma, redis).catch(() => {});

  // Schedule recurring check interval
  return setInterval(() => {
    checkAndCleanInactiveSessions(io, prisma, redis).catch(() => {});
  }, intervalMs);
}
