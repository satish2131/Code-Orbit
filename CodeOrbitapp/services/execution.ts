import { api } from './api';
import { PISTON_API_URL } from '../constants/config';

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

export const executeCode = async (
  language: string,
  code: string,
  stdin?: string
): Promise<ExecutionResult> => {
  try {
    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        version: '*',
        files: [{ content: code }],
        stdin: stdin || '',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const stdoutStr = data.run?.stdout || data.run?.output || '';
      const stderrStr = data.run?.stderr || (data.run?.code !== 0 ? data.run?.output || '' : '');
      return {
        stdout: stdoutStr,
        stderr: stderrStr,
        exit_code: typeof data.run?.code === 'number' ? data.run.code : 0,
        duration_ms: data.run?.duration || 0,
      };
    }
  } catch {}

  // Fallback to backend server code execution route
  try {
    const res = await api.execution.run(language, code, stdin);
    return {
      stdout: res.stdout || '',
      stderr: res.stderr || '',
      exit_code: typeof res.exit_code === 'number' ? res.exit_code : 0,
      duration_ms: res.duration_ms || 0,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Execution failed',
      exit_code: 1,
      duration_ms: 0,
    };
  }
};

export const executeWebCode = (
  html: string,
  css: string,
  js: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${css}</style>
      </head>
      <body>
        ${html}
        <script>
          const originalConsole = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          
          console.log = (...args) => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'console',
              method: 'log',
              args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
            }));
            originalConsole.apply(console, args);
          };
          
          console.error = (...args) => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'console',
              method: 'error',
              args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
            }));
            originalError.apply(console, args);
          };
          
          console.warn = (...args) => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'console',
              method: 'warn',
              args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
            }));
            originalWarn.apply(console, args);
          };
          
          window.onerror = (message, source, lineno, colno, error) => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'error',
              message: String(message),
              line: lineno,
              col: colno
            }));
          };
          
          try {
            ${js}
          } catch (e) {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'error',
              message: e.message
            }));
          }
        </script>
      </body>
    </html>
  `;
};
