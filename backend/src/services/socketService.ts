import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { bufferTabChange, flushSessionWrites } from './bufferService';
import { touchSessionActivity, INACTIVITY_TIMEOUT_SECONDS } from './sessionCleanupService';

interface AuthData {
  userId?: string;
  guestName?: string;
  token?: string;
}

interface SessionRoom {
  sessionId: string;
  code: string;
  hostId: string;
}

export const setupSocketHandlers = (io: Server, prisma: PrismaClient, redis: Redis) => {
  const sessionRooms = new Map<string, SessionRoom>();

  io.use(async (socket, next) => {
    const auth = socket.handshake.auth as AuthData;
    
    if (auth.token) {
      try {
        const decoded = jwt.verify(auth.token, process.env.JWT_SECRET || 'secret') as { userId: string };
        socket.data.userId = decoded.userId;
        socket.data.isGuest = false;
      } catch (error) {
        socket.data.userId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        socket.data.isGuest = true;
        socket.data.guestName = auth.guestName || 'Guest';
      }
    } else if (auth.userId) {
      socket.data.userId = auth.userId;
      socket.data.isGuest = true;
      socket.data.guestName = auth.guestName || 'Guest';
    } else {
      socket.data.userId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      socket.data.isGuest = true;
      socket.data.guestName = 'Guest';
    }

    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.data.userId}`);

    socket.on('join_session', async (data: { sessionCode: string }) => {
      try {
        const { sessionCode } = data;
        const userIdStr = String(socket.data.userId || '');
        const isGuest = socket.data.isGuest || userIdStr.startsWith('guest-') || !userIdStr;
        
        let sessionData = await redis.get(`session:${sessionCode}`);
        if (!sessionData) {
          const dbSession = await prisma.session.findUnique({ where: { code: sessionCode } });
          if (dbSession && dbSession.status !== 'ended') {
            sessionData = JSON.stringify({ sessionId: dbSession.id, hostId: dbSession.hostId });
            await redis.setex(`session:${sessionCode}`, 1800, sessionData);
          }
        }

        if (!sessionData) {
          socket.emit('session_error', { code: 'SESSION_NOT_FOUND', message: 'Session not found or expired' });
          return;
        }

        const parsed = JSON.parse(sessionData);
        sessionRooms.set(socket.id, {
          sessionId: parsed.sessionId,
          code: sessionCode,
          hostId: parsed.hostId,
        });

        socket.join(sessionCode);

        const isHostUser = Boolean(userIdStr && userIdStr === parsed.hostId);
        const dbSession = await prisma.session.findUnique({ where: { code: sessionCode } });
        const requiresApproval = dbSession?.approvalMode === 'approval_required';
        const initialStatus = (isHostUser || !requiresApproval) ? 'active' : 'pending';

        // Ensure user record exists in PostgreSQL for proper user-scoped relation
        if (userIdStr) {
          const userExists = await prisma.user.findUnique({ where: { id: userIdStr } });
          if (!userExists) {
            await prisma.user.create({
              data: {
                id: userIdStr,
                username: userIdStr,
                name: socket.data.guestName || (isHostUser ? 'Host' : 'Participant'),
                authProvider: 'guest',
              },
            }).catch(() => {});
          }
        }

        // Verify or create participant record in PostgreSQL
        let participant = null;
        if (userIdStr) {
          participant = await prisma.participant.findFirst({
            where: { sessionId: parsed.sessionId, userId: userIdStr },
          });
        }

        if (!participant) {
          participant = await prisma.participant.create({
            data: {
              sessionId: parsed.sessionId,
              userId: userIdStr || null,
              guestName: socket.data.guestName || (isHostUser ? 'Host' : 'Participant'),
              role: isHostUser ? 'host' : 'viewer',
              status: initialStatus,
            },
          });
        } else if (participant.status === 'declined') {
          participant = await prisma.participant.update({
            where: { id: participant.id },
            data: { status: initialStatus },
          });
        }

        const session = await prisma.session.findUnique({
          where: { code: sessionCode },
          include: {
            participants: {
              where: { status: { in: ['active', 'pending'] } },
            },
            fileTabs: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        });

        if (session) {
          socket.emit('session_joined', {
            schemaVersion: 1,
            session,
            version: (session as any).version || 1,
            participants: session.participants,
            fileTabs: session.fileTabs,
          });

          // Broadcast updated participants list to everyone in the room
          io.to(sessionCode).emit('participants_updated', session.participants);
        }
      } catch (err: any) {
        console.error('Error in join_session:', err);
        socket.emit('session_error', { code: 'JOIN_FAILED', message: 'Failed to join session room.' });
      }
    });

    socket.on('approve_participant', async (data: { sessionCode: string; participantId: string }) => {
      const { sessionCode, participantId } = data;

      try {
        await prisma.participant.update({
          where: { id: participantId },
          data: { status: 'active', role: 'viewer' },
        });

        const session = await prisma.session.findUnique({
          where: { code: sessionCode },
        });

        if (session) {
          const updatedParticipants = await prisma.participant.findMany({
            where: { sessionId: session.id, status: { in: ['active', 'pending'] } },
          });

          io.to(sessionCode).emit('participants_updated', updatedParticipants);
          io.to(sessionCode).emit('join_approved', { sessionCode, participantId });
        }
      } catch (err) {
        console.error('Failed to approve participant:', err);
      }
    });

    socket.on('decline_participant', async (data: { sessionCode: string; participantId: string }) => {
      const { sessionCode, participantId } = data;

      try {
        await prisma.participant.update({
          where: { id: participantId },
          data: { status: 'declined' },
        });

        const session = await prisma.session.findUnique({
          where: { code: sessionCode },
        });

        if (session) {
          const updatedParticipants = await prisma.participant.findMany({
            where: { sessionId: session.id, status: { in: ['active', 'pending'] } },
          });

          io.to(sessionCode).emit('participants_updated', updatedParticipants);
        }
      } catch (err) {
        console.error('Failed to decline participant:', err);
      }
    });

    socket.on('request_edit_permission', async (data: { sessionCode: string }) => {
      const { sessionCode } = data;
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      try {
        const participant = await prisma.participant.findFirst({
          where: {
            sessionId: room.sessionId,
            userId: socket.data.userId,
            status: 'active',
          },
        });

        const participantName = participant?.guestName || socket.data.guestName || 'Participant';
        const participantId = participant?.id || socket.id;

        io.to(sessionCode).emit('edit_permission_requested', {
          participantId,
          participantName,
          userId: socket.data.userId,
        });
      } catch (err) {
        console.error('Failed to handle request_edit_permission:', err);
      }
    });

    socket.on('respond_edit_permission', async (data: { sessionCode: string; participantId: string; approved: boolean }) => {
      const { sessionCode, participantId, approved } = data;
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      try {
        const newRole = approved ? 'co_editor' : 'viewer';

        await prisma.participant.update({
          where: { id: participantId },
          data: { role: newRole },
        }).catch(() => {});

        const updatedParticipants = await prisma.participant.findMany({
          where: { sessionId: room.sessionId, status: { in: ['active', 'pending'] } },
        });

        io.to(sessionCode).emit('participants_updated', updatedParticipants);
        io.to(sessionCode).emit('edit_permission_response', {
          participantId,
          approved,
          role: newRole,
        });
      } catch (err) {
        console.error('Failed to respond to edit permission:', err);
      }
    });

    socket.on('revoke_edit_permission', async (data: { sessionCode: string; participantId: string }) => {
      const { sessionCode, participantId } = data;
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      try {
        await prisma.participant.update({
          where: { id: participantId },
          data: { role: 'viewer' },
        }).catch(() => {});

        const updatedParticipants = await prisma.participant.findMany({
          where: { sessionId: room.sessionId, status: { in: ['active', 'pending'] } },
        });

        io.to(sessionCode).emit('participants_updated', updatedParticipants);
        io.to(sessionCode).emit('edit_permission_revoked', { participantId });
      } catch (err) {
        console.error('Failed to revoke edit permission:', err);
      }
    });

    socket.on('create_session', async (data: {
      languagePreset: string;
      approvalMode: string;
      maxParticipants: number;
    }) => {
      try {
        // Ensure hostId references a valid User record in database
        let hostUserId = socket.data.userId;
        let validUser = null;
        if (hostUserId) {
          validUser = await prisma.user.findUnique({ where: { id: hostUserId } });
        }
        if (!validUser) {
          const newUserId = hostUserId || `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          validUser = await prisma.user.create({
            data: {
              id: newUserId,
              username: newUserId,
              name: socket.data.guestName || 'Host User',
              authProvider: 'guest',
            },
          }).catch(async () => {
            return await prisma.user.findUnique({ where: { id: newUserId } });
          });
          if (validUser) {
            hostUserId = validUser.id;
            socket.data.userId = hostUserId;
          }
        }

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const session = await prisma.session.create({
          data: {
            code,
            hostId: hostUserId,
            languagePreset: data.languagePreset,
            approvalMode: data.approvalMode,
            maxParticipants: data.maxParticipants,
            status: 'waiting',
          },
        });

        await prisma.participant.create({
          data: {
            sessionId: session.id,
            userId: hostUserId,
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

        const presetConfig = LANGUAGE_FILE_MAP[data.languagePreset] ?? {
          files: [`main.${data.languagePreset}`],
          language: data.languagePreset,
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
          hostId: hostUserId,
        }));

        sessionRooms.set(socket.id, {
          sessionId: session.id,
          code,
          hostId: hostUserId,
        });

        socket.join(code);

        const createdTabs = await prisma.fileTab.findMany({
          where: { sessionId: session.id },
          orderBy: { orderIndex: 'asc' },
        });

        socket.emit('session_created', {
          schemaVersion: 1,
          session,
          version: (session as any).version || 1,
          participants: [],
          fileTabs: createdTabs,
        });
      } catch (err: any) {
        console.error('Failed to create session:', err);
        socket.emit('session_error', {
          code: 'CREATE_SESSION_FAILED',
          message: err?.message || 'Failed to create session room on backend.',
        });
      }
    });

    socket.on('create_tab', async (data: { sessionCode: string; filename: string; language: string }) => {
      const { sessionCode, filename, language } = data;
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      const participant = await prisma.participant.findFirst({
        where: { sessionId: room.sessionId, userId: socket.data.userId, status: 'active' },
      });
      if (!participant || (participant.role !== 'host' && participant.role !== 'co_editor')) {
        socket.emit('session_error', { code: 'UNAUTHORIZED_ACTION', message: 'Permission denied. Host edit permission required.' });
        return;
      }

      const count = await prisma.fileTab.count({ where: { sessionId: room.sessionId } });
      await prisma.fileTab.create({
        data: {
          sessionId: room.sessionId,
          filename,
          language,
          content: '',
          orderIndex: count,
        },
      });

      const allTabs = await prisma.fileTab.findMany({
        where: { sessionId: room.sessionId },
        orderBy: { orderIndex: 'asc' },
      });

      io.to(sessionCode).emit('files_updated', allTabs);
    });

    socket.on('delete_tab', async (data: { sessionCode: string; tabId: string }) => {
      const { sessionCode, tabId } = data;
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      const participant = await prisma.participant.findFirst({
        where: { sessionId: room.sessionId, userId: socket.data.userId, status: 'active' },
      });
      if (!participant || (participant.role !== 'host' && participant.role !== 'co_editor')) {
        socket.emit('session_error', { code: 'UNAUTHORIZED_ACTION', message: 'Permission denied. Host edit permission required.' });
        return;
      }

      await prisma.fileTab.delete({ where: { id: tabId } }).catch(() => {});

      const allTabs = await prisma.fileTab.findMany({
        where: { sessionId: room.sessionId },
        orderBy: { orderIndex: 'asc' },
      });

      io.to(sessionCode).emit('files_updated', allTabs);
    });

    socket.on('rename_tab', async (data: { sessionCode: string; tabId: string; newFilename: string }) => {
      const { sessionCode, tabId, newFilename } = data;
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      const participant = await prisma.participant.findFirst({
        where: { sessionId: room.sessionId, userId: socket.data.userId, status: 'active' },
      });
      if (!participant || (participant.role !== 'host' && participant.role !== 'co_editor')) {
        socket.emit('session_error', { code: 'UNAUTHORIZED_ACTION', message: 'Permission denied. Host edit permission required.' });
        return;
      }

      await prisma.fileTab.update({
        where: { id: tabId },
        data: { filename: newFilename },
      }).catch(() => {});

      const allTabs = await prisma.fileTab.findMany({
        where: { sessionId: room.sessionId },
        orderBy: { orderIndex: 'asc' },
      });

      io.to(sessionCode).emit('files_updated', allTabs);
    });

    socket.on('code_change', async (data: { sessionCode: string; tabId: string; content: string }) => {
      const { sessionCode, tabId, content } = data;
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      const participant = await prisma.participant.findFirst({
        where: {
          sessionId: room.sessionId,
          userId: socket.data.userId,
          status: 'active',
        },
      });

      // Strict Server-Side Authorization Boundary: Only active host or approved co_editor can push code changes
      if (!participant || (participant.role !== 'host' && participant.role !== 'co_editor')) {
        socket.emit('session_error', {
          code: 'UNAUTHORIZED_EDIT',
          message: 'Permission denied. You do not have host permission to edit code.',
        });
        return;
      }

      bufferTabChange(prisma, tabId, content, room.sessionId);
      touchSessionActivity(prisma, redis, room.sessionId, sessionCode);

      socket.to(sessionCode).emit('code_update', {
        tabId,
        content,
        participantId: socket.data.userId,
      });
    });

    socket.on('cursor_position', (data: {
      sessionCode: string;
      position: {
        line: number;
        column: number;
        participant_id: string;
        participant_name: string;
        color: string;
      };
    }) => {
      socket.to(data.sessionCode).emit('cursor_update', {
        ...data.position,
        participant_id: socket.data.userId,
      });
    });

    socket.on('annotation_stroke', async (data: {
      sessionCode: string;
      stroke: any;
    }) => {
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      const participant = await prisma.participant.findFirst({
        where: {
          sessionId: room.sessionId,
          userId: socket.data.userId,
          status: 'active',
        },
      });

      if (!participant || (participant.role !== 'host' && participant.role !== 'co_editor')) {
        return;
      }

      socket.to(data.sessionCode).emit('annotation_received', {
        ...data.stroke,
        participant_id: socket.data.userId,
      });
    });

    socket.on('chat_message', async (data: { sessionCode: string; text: string }) => {
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      const participant = await prisma.participant.findFirst({
        where: {
          sessionId: room.sessionId,
          userId: socket.data.userId,
        },
      });

      if (!participant) return;

      const message = await prisma.chatMessage.create({
        data: {
          sessionId: room.sessionId,
          participantId: participant.id,
          text: data.text,
        },
        include: {
          participant: {
            select: { guestName: true, userId: true },
          },
        },
      });

      io.to(data.sessionCode).emit('chat_message', {
        id: message.id,
        participantId: message.participantId,
        text: message.text,
        createdAt: message.createdAt,
        guestName: message.participant.guestName,
      });
    });

    socket.on('run_code', async (data: {
      sessionCode: string;
      language: string;
      code: string;
      stdin?: string;
    }) => {
      const room = sessionRooms.get(socket.id);
      if (!room) return;

      // Server-Side Execution Authorization: Only active hosts & co-editors can run code
      const participant = await prisma.participant.findFirst({
        where: {
          sessionId: room.sessionId,
          userId: socket.data.userId,
          status: 'active',
        },
      });

      if (!participant || (participant.role !== 'host' && participant.role !== 'co_editor')) {
        socket.emit('error', { message: 'Execution permission denied: active host or co-editor role required' });
        return;
      }

      const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
      
      try {
        const response = await fetch(`${PISTON_API_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: data.language,
            version: '*',
            files: [{ content: data.code }],
            stdin: data.stdin || '',
          }),
        });

        const result = (await response.json()) as any;

        await prisma.runLog.create({
          data: {
            sessionId: room.sessionId,
            participantId: participant.id,
            language: data.language,
            stdin: data.stdin,
            stdout: result.run?.output || '',
            stderr: result.run?.stderr || '',
            exitCode: result.run?.code || 0,
            durationMs: result.run?.duration || 0,
          },
        });

        io.to(data.sessionCode).emit('run_result', {
          stdout: result.run?.output || '',
          stderr: result.run?.stderr || '',
          exit_code: result.run?.code || 0,
          duration_ms: result.run?.duration || 0,
        });
      } catch (error) {
        io.to(data.sessionCode).emit('run_result', {
          stdout: '',
          stderr: 'Execution failed',
          exit_code: 1,
          duration_ms: 0,
        });
      }
    });

    socket.on('end_session', async (data: { sessionCode: string }) => {
      const { sessionCode } = data;
      const room = sessionRooms.get(socket.id);

      try {
        const session = await prisma.session.findUnique({
          where: room?.sessionId ? { id: room.sessionId } : { code: sessionCode },
        });

        if (!session) return;

        await flushSessionWrites(prisma, session.id);

        const finalStatus = session.status === 'active' ? 'ended' : 'cancelled';
        await prisma.session.update({
          where: { id: session.id },
          data: { status: finalStatus, endedAt: new Date() },
        });

        await redis.del(`session:${sessionCode}`);
        sessionRooms.delete(socket.id);

        io.to(sessionCode).emit('session_ended', {
          reason: 'host_ended',
          message: 'The host has ended this session.',
        });
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    });

    socket.on('leave_session', async (data: { sessionCode: string }) => {
      const room = sessionRooms.get(socket.id);
      if (room) {
        try {
          await flushSessionWrites(prisma, room.sessionId);
        } catch (e) {}
      }
      socket.leave(data.sessionCode);
      sessionRooms.delete(socket.id);
      
      io.to(data.sessionCode).emit('participant_left', {
        participantId: socket.data.userId,
      });
    });

    socket.on('disconnect', async () => {
      const room = sessionRooms.get(socket.id);
      if (room) {
        try {
          await flushSessionWrites(prisma, room.sessionId);
        } catch (e) {}
        io.to(room.code).emit('participant_left', {
          participantId: socket.data.userId,
        });
        sessionRooms.delete(socket.id);
      }
      console.log(`User disconnected: ${socket.data.userId}`);
    });
  });
};
