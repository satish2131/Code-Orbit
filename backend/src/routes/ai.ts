import { Router, Request, Response } from 'express';
import { generateAIResponse, streamAIResponse, AIMessageInput, AIContextInput } from '../services/geminiService';

const router = Router();

// 1. Non-streaming AI Chat Endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, history, mode = 'coding', context } = req.body as {
      prompt: string;
      history?: AIMessageInput[];
      mode?: 'coding' | 'support';
      context?: AIContextInput;
    };

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A prompt string is required.' });
    }

    const response = await generateAIResponse(prompt, history || [], mode, context);
    res.json({ response });
  } catch (error: any) {
    console.error('AI chat route error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// 2. Token Streaming AI Endpoint via Server-Sent Events (SSE) / Chunked Stream
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { prompt, history, mode = 'coding', context } = req.body as {
      prompt: string;
      history?: AIMessageInput[];
      mode?: 'coding' | 'support';
      context?: AIContextInput;
    };

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A prompt string is required.' });
    }

    // Set headers for Server-Sent Events (SSE) streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let isClosed = false;
    req.on('close', () => {
      isClosed = true;
    });

    const fullText = await streamAIResponse(
      prompt,
      history || [],
      mode,
      (chunk: string) => {
        if (!isClosed) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      },
      context
    );

    if (!isClosed) {
      res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('AI stream route error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream AI response' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

export default router;
