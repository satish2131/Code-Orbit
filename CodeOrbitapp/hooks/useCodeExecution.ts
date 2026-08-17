import { useState, useCallback } from 'react';
import { executeCode, executeWebCode } from '../services/execution';
import { LANGUAGE_PRESETS, getLanguagePreset } from '../constants';

export const useCodeExecution = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);

  const runCode = useCallback(
    async (language: string, files: Record<string, string>, stdin?: string) => {
      setIsRunning(true);
      setOutput('');
      setError('');
      setExitCode(null);

      try {
        const preset = LANGUAGE_PRESETS[language] || getLanguagePreset(language);

        if (preset?.runner === 'webview') {
          const html = files['index.html'] || files['main.html'] || Object.values(files)[0] || '';
          const css = files['style.css'] || '';
          const js = files['script.js'] || '';
          const fullHtml = executeWebCode(html, css, js);
          setOutput(fullHtml);
          setExitCode(0);
          return fullHtml;
        } else {
          const mainFile = Object.values(files)[0] || '';
          const targetLang = preset?.pistonLanguage || preset?.id || language;
          const result = await executeCode(targetLang, mainFile, stdin);
          setOutput(result.stdout);
          setError(result.stderr);
          setExitCode(result.exit_code);
          return result;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Execution failed';
        setError(errorMessage);
        setExitCode(1);
        return { stdout: '', stderr: errorMessage, exitCode: 1, duration: 0 };
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setOutput('');
    setError('');
    setExitCode(null);
  }, []);

  return {
    isRunning,
    output,
    error,
    exitCode,
    runCode,
    reset,
  };
};
