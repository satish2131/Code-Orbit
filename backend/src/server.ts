import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import executionRoutes from './routes/execution';
import contactRoutes from './routes/contact';
import aiRoutes from './routes/ai';
import { setupSocketHandlers } from './services/socketService';
import { startSessionCleanupTask } from './services/sessionCleanupService';

const app = express();
const server = http.createServer(app);

const prisma = new PrismaClient();
const memoryCache = new Map<string, string>();
let isRedisConnected = false;

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 2) return null;
    return 1000;
  },
});

redisClient.on('connect', () => {
  isRedisConnected = true;
  console.log('Redis connected');
});

redisClient.on('error', () => {
  isRedisConnected = false;
});

redisClient.connect().catch(() => {
  console.log('Redis offline, using in-memory cache fallback');
});

const redis = {
  async get(key: string): Promise<string | null> {
    if (isRedisConnected) {
      try { return await redisClient.get(key); } catch {}
    }
    return memoryCache.get(key) || null;
  },
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    memoryCache.set(key, value);
    if (isRedisConnected) {
      try { await redisClient.setex(key, seconds, value); } catch {}
    }
    return 'OK';
  },
  async del(...keys: string[]): Promise<number> {
    keys.forEach((k) => memoryCache.delete(k));
    if (isRedisConnected) {
      try { return await redisClient.del(...keys); } catch {}
    }
    return keys.length;
  },
} as unknown as Redis;

const corsOrigin = process.env.CORS_ORIGIN || '*';

const io = new Server(server, {
  cors: {
    origin: corsOrigin === '*' ? true : corsOrigin,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.set('prisma', prisma);
app.set('redis', redis);
app.set('io', io);

app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/execution', executionRoutes);
app.use('/contact', contactRoutes);
app.use('/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setupSocketHandlers(io, prisma, redis);
startSessionCleanupTask(io, prisma, redis);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected');
    
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (bound to 0.0.0.0)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

import { flushAllPendingWrites } from './services/bufferService';

const gracefulShutdown = async () => {
  console.log('[Server Shutdown] Flushing all pending buffered file edits to database...');
  try {
    await flushAllPendingWrites(prisma);
    await prisma.$disconnect();
    redis.disconnect();
  } catch (e) {}
  server.close(() => {
    console.log('[Server Shutdown] Clean shutdown complete.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
