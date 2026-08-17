import { PrismaClient } from '@prisma/client';

interface PendingWrite {
  tabId: string;
  sessionId: string;
  content: string;
  timer: NodeJS.Timeout;
}

const pendingWrites = new Map<string, PendingWrite>();

export const bufferTabChange = (
  prisma: PrismaClient,
  tabId: string,
  content: string,
  sessionId: string
) => {
  const existing = pendingWrites.get(tabId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(async () => {
    pendingWrites.delete(tabId);
    try {
      await prisma.fileTab.update({
        where: { id: tabId },
        data: { content },
      });
      console.log(`[BufferService] Throttled DB flush completed for tab: ${tabId} (session: ${sessionId})`);
    } catch (err) {
      console.error(`[BufferService] DB flush failed for tab: ${tabId}`, err);
    }
  }, 3000); // 3-second write-back debounce window

  pendingWrites.set(tabId, { tabId, sessionId, content, timer });
};

export const flushSessionWrites = async (
  prisma: PrismaClient,
  sessionId: string,
  timeoutMs = 3000
): Promise<void> => {
  const entries: PendingWrite[] = [];
  for (const [tabId, entry] of pendingWrites.entries()) {
    if (entry.sessionId === sessionId) {
      clearTimeout(entry.timer);
      entries.push(entry);
      pendingWrites.delete(tabId);
    }
  }

  if (entries.length === 0) return;

  const flushPromise = Promise.all(
    entries.map(async (entry) => {
      try {
        await prisma.fileTab.update({
          where: { id: entry.tabId },
          data: { content: entry.content },
        });
      } catch (err) {
        console.error(`[BufferService] Session flush error for tab ${entry.tabId}:`, err);
      }
    })
  );

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([flushPromise, timeoutPromise]);
  console.log(`[BufferService] Session-scoped flush completed for session: ${sessionId} (${entries.length} tabs)`);
};

export const flushAllPendingWrites = async (
  prisma: PrismaClient,
  timeoutMs = 3000
): Promise<void> => {
  const entries = Array.from(pendingWrites.values());
  pendingWrites.clear();

  if (entries.length === 0) return;

  const flushPromise = Promise.all(
    entries.map(async (entry) => {
      clearTimeout(entry.timer);
      try {
        await prisma.fileTab.update({
          where: { id: entry.tabId },
          data: { content: entry.content },
        });
      } catch (err) {
        console.error(`[BufferService] Global flush error for tab ${entry.tabId}:`, err);
      }
    })
  );

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([flushPromise, timeoutPromise]);
  console.log(`[BufferService] Global shutdown flush completed (${entries.length} pending tabs)`);
};
