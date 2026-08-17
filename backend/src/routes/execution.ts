import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate, schemas } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const router = Router();

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

const LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
  swift: 'swift',
  kotlin: 'kotlin',
};

async function runLocalCode(language: string, code: string): Promise<{ stdout: string; stderr: string; exit_code: number }> {
  const lang = language.toLowerCase();
  const tmpDir = os.tmpdir();
  const fileId = `code_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  try {
    if (lang === 'python') {
      const { stdout, stderr } = await execFileAsync('python', ['-c', code], { timeout: 10000, maxBuffer: 1024 * 1024 });
      return { stdout, stderr, exit_code: 0 };
    }

    if (lang === 'javascript' || lang === 'node') {
      const { stdout, stderr } = await execFileAsync('node', ['-e', code], { timeout: 10000, maxBuffer: 1024 * 1024 });
      return { stdout, stderr, exit_code: 0 };
    }

    if (lang === 'typescript') {
      const filePath = path.join(tmpDir, `${fileId}.ts`);
      fs.writeFileSync(filePath, code);
      try {
        const { stdout, stderr } = await execAsync(`npx tsx "${filePath}"`, { timeout: 15000, maxBuffer: 1024 * 1024 });
        return { stdout, stderr, exit_code: 0 };
      } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    if (lang === 'cpp' || lang === 'c') {
      const ext = lang === 'cpp' ? 'cpp' : 'c';
      const compiler = lang === 'cpp' ? 'g++' : 'gcc';
      const srcPath = path.join(tmpDir, `${fileId}.${ext}`);
      const outPath = path.join(tmpDir, `${fileId}.exe`);
      fs.writeFileSync(srcPath, code);

      try {
        await execAsync(`${compiler} "${srcPath}" -o "${outPath}"`, { timeout: 10000 });
        const { stdout, stderr } = await execFileAsync(outPath, [], { timeout: 10000 });
        return { stdout, stderr, exit_code: 0 };
      } catch (e: any) {
        return { stdout: '', stderr: e.stderr || `${compiler} compiler not found on PATH. Install ${compiler} to run ${language.toUpperCase()} code locally.`, exit_code: 1 };
      } finally {
        if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      }
    }

    if (lang === 'java') {
      const srcPath = path.join(tmpDir, 'Main.java');
      fs.writeFileSync(srcPath, code);
      try {
        await execAsync(`javac "${srcPath}"`, { timeout: 10000 });
        const { stdout, stderr } = await execAsync(`java -cp "${tmpDir}" Main`, { timeout: 10000 });
        return { stdout, stderr, exit_code: 0 };
      } catch (e: any) {
        return { stdout: '', stderr: e.stderr || 'Java JDK not found on system PATH. Install Java to run Java code locally.', exit_code: 1 };
      } finally {
        if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
        const classPath = path.join(tmpDir, 'Main.class');
        if (fs.existsSync(classPath)) fs.unlinkSync(classPath);
      }
    }

    if (lang === 'go') {
      const srcPath = path.join(tmpDir, `${fileId}.go`);
      fs.writeFileSync(srcPath, code);
      try {
        const { stdout, stderr } = await execAsync(`go run "${srcPath}"`, { timeout: 10000 });
        return { stdout, stderr, exit_code: 0 };
      } catch (e: any) {
        return { stdout: '', stderr: e.stderr || 'Go compiler not found on system PATH.', exit_code: 1 };
      } finally {
        if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
      }
    }

    if (lang === 'php') {
      const { stdout, stderr } = await execFileAsync('php', ['-r', code], { timeout: 10000 });
      return { stdout, stderr, exit_code: 0 };
    }

    if (lang === 'ruby') {
      const { stdout, stderr } = await execFileAsync('ruby', ['-e', code], { timeout: 10000 });
      return { stdout, stderr, exit_code: 0 };
    }
  } catch (err: any) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || 'Execution error',
      exit_code: typeof err.code === 'number' ? err.code : 1,
    };
  }

  return { stdout: '', stderr: `Interpreter for '${language}' is not installed locally. Python, JavaScript, and TypeScript are supported out of the box!`, exit_code: 1 };
}

router.post('/run', authenticate, validate(schemas.runCode), async (req: AuthRequest, res: Response) => {
  try {
    const { language, code, stdin } = req.body;
    const pistonLang = LANGUAGE_MAP[language] || language;

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let exit_code = 0;

    try {
      const response = await fetch(`${PISTON_API_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: pistonLang,
          version: '*',
          files: [{ content: code }],
          stdin: stdin || '',
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as any;
        stdout = result.run?.stdout || result.run?.output || '';
        stderr = result.run?.stderr || '';
        exit_code = result.run?.code || 0;
      } else {
        throw new Error(`Piston status ${response.status}`);
      }
    } catch (apiError) {
      console.log(`Piston API unavailable for ${language}, executing locally...`);
      const localResult = await runLocalCode(language, code);
      stdout = localResult.stdout;
      stderr = localResult.stderr;
      exit_code = localResult.exit_code;
    }

    const duration = Date.now() - startTime;
    res.json({
      stdout,
      stderr,
      exit_code,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ message: 'Code execution failed' });
  }
});

router.post('/run-web', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { html, css, js } = req.body;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${css || ''}</style>
        </head>
        <body>
          ${html || ''}
          <script>${js || ''}</script>
        </body>
      </html>
    `;

    res.json({ html: fullHtml });
  } catch (error) {
    console.error('Web execution error:', error);
    res.status(500).json({ message: 'Web code execution failed' });
  }
});

router.get('/languages', async (req: AuthRequest, res: Response) => {
  try {
    const response = await fetch(`${PISTON_API_URL}/languages`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch languages');
    }

    const languages = await response.json();
    res.json({ languages });
  } catch (error) {
    console.error('Languages fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch languages' });
  }
});

export default router;
