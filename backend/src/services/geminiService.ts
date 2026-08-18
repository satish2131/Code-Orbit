import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_KEY ||
  '';

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-pro',
].filter(Boolean) as string[];

let cachedWorkingModel: string = 'gemini-flash-lite-latest';

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('✅ Google Gemini AI Service initialized (primary: gemini-flash-lite-latest)');
  } catch (err) {
    console.warn('⚠️ Failed to initialize GoogleGenerativeAI:', err);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not set. Using intelligent fallback assistant.');
}

const CODING_SYSTEM_INSTRUCTION = `You are CodeOrbit AI, an elite, helpful, and concise coding assistant inside the CodeOrbit collaborative mobile IDE platform.
You specialize in software engineering, debugging, code explanation, refactoring, algorithms, and writing clean, production-grade code in all languages (Python, JavaScript, TypeScript, C++, C, Java, Go, Rust, PHP, Ruby, Swift, Kotlin, HTML/CSS).
Always format code with markdown code blocks indicating the language (e.g. \`\`\`python ... \`\`\`). Keep explanations crisp, practical, and easy to read on mobile screens.`;

const SUPPORT_SYSTEM_INSTRUCTION = `You are the CodeOrbit Live Support Assistant. You provide helpful, friendly, concise, and accurate assistance for users of the CodeOrbit mobile pair-programming application.
Key Features of CodeOrbit:
- Collaborative coding rooms with 6-character room codes.
- 13+ languages supported: Web (HTML/CSS/JS live preview), Python, JavaScript, TypeScript, Java, C++, C, Go, Rust, PHP, Ruby, Swift, Kotlin.
- Piston sandboxed code execution with terminal logs.
- Host permission management (Co-editor vs Viewer roles).
- Multi-file tabs management.
- Live chat, AI coding assistant, bug reporting, and email support.
Keep answers concise, direct, and helpful.`;

export interface AIMessageInput {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface AIContextInput {
  languagePreset?: string;
  currentFilename?: string;
  sessionCode?: string;
}

export async function generateAIResponse(
  prompt: string,
  history: AIMessageInput[] = [],
  mode: 'coding' | 'support' = 'coding',
  context?: AIContextInput
): Promise<string> {
  const systemInstruction =
    mode === 'support' ? SUPPORT_SYSTEM_INSTRUCTION : CODING_SYSTEM_INSTRUCTION;

  let contextPrompt = '';
  if (context?.languagePreset || context?.currentFilename) {
    contextPrompt = `[Workspace Context: Language = ${context.languagePreset || 'N/A'}, Active File = ${context.currentFilename || 'N/A'}]\n\n`;
  }

  const fullPrompt = `${contextPrompt}${prompt}`;

  if (genAI && GEMINI_API_KEY) {
    const modelsToTry = [
      cachedWorkingModel,
      ...CANDIDATE_MODELS.filter((m) => m !== cachedWorkingModel),
    ];

    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const chat = model.startChat({
          history: formattedHistory,
        });

        const result = await chat.sendMessage(fullPrompt);
        const response = await result.response;
        const text = response.text();
        if (text) {
          cachedWorkingModel = modelName;
          return text;
        }
      } catch (err: any) {
        console.warn(`[GeminiService] Model '${modelName}' attempt failed:`, err?.message || err);
      }
    }
  }

  return getFallbackResponse(prompt, mode, context);
}

export async function streamAIResponse(
  prompt: string,
  history: AIMessageInput[] = [],
  mode: 'coding' | 'support' = 'coding',
  onChunk: (chunk: string) => void,
  context?: AIContextInput
): Promise<string> {
  const systemInstruction =
    mode === 'support' ? SUPPORT_SYSTEM_INSTRUCTION : CODING_SYSTEM_INSTRUCTION;

  let contextPrompt = '';
  if (context?.languagePreset || context?.currentFilename) {
    contextPrompt = `[Workspace Context: Language = ${context.languagePreset || 'N/A'}, Active File = ${context.currentFilename || 'N/A'}]\n\n`;
  }

  const fullPrompt = `${contextPrompt}${prompt}`;

  if (genAI && GEMINI_API_KEY) {
    const modelsToTry = [
      cachedWorkingModel,
      ...CANDIDATE_MODELS.filter((m) => m !== cachedWorkingModel),
    ];

    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const chat = model.startChat({
          history: formattedHistory,
        });

        const result = await chat.sendMessageStream(fullPrompt);
        let fullText = '';
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullText += text;
            onChunk(text);
          }
        }

        if (fullText) {
          cachedWorkingModel = modelName;
          return fullText;
        }
      } catch (err: any) {
        console.warn(`[GeminiService] Stream model '${modelName}' attempt failed:`, err?.message || err);
      }
    }
  }

  const fallback = getFallbackResponse(prompt, mode, context);
  const words = fallback.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    onChunk(chunk);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return fallback;
}

function getFallbackResponse(
  prompt: string,
  mode: 'coding' | 'support',
  context?: AIContextInput
): string {
  const lower = prompt.toLowerCase();

  if (mode === 'support') {
    if (lower.includes('session') || lower.includes('create') || lower.includes('room')) {
      return "To start a live coding room, navigate to **Home** and tap **Create Session**. Select your language preset (e.g. Python, Web, TypeScript) and share your 6-character room code with your collaborators!";
    }
    if (lower.includes('language') || lower.includes('piston') || lower.includes('support')) {
      return "CodeOrbit supports 13+ languages including **Web (HTML/CSS/JS live preview)**, Python, JavaScript, TypeScript, C++, C, Java, Go, Rust, PHP, Ruby, Swift, and Kotlin via isolated sandbox runners.";
    }
    if (lower.includes('join') || lower.includes('guest') || lower.includes('account')) {
      return "Collaborators can join without an account as a **Guest** simply by entering their nickname and room code, or by scanning your room's QR code!";
    }
    return "Thanks for reaching out to CodeOrbit Live Support! I can assist with session creation, supported compilers, host permissions, live sandboxes, or account settings. What would you like help with?";
  }

  // Coding mode fallback
  if (lower.includes('debug') || lower.includes('error') || lower.includes('fix')) {
    return `Here is a systematic debugging guide for your code:

1. **Verify Inputs & Types**: Ensure arguments match expected parameters.
2. **Inspect Error Trace**: Check the line number and error message in the console.
3. **Handle Edge Cases**: Check for \`null\`, \`undefined\`, or out-of-bound indices.

\`\`\`typescript
try {
  // Guard clause
  if (!data) throw new Error("Invalid payload");
  processData(data);
} catch (err) {
  console.error("Execution error:", err);
}
\`\`\`

Paste your specific code snippet and I will inspect it line by line!`;
  }

  if (lower.includes('python') || lower.includes('function') || lower.includes('def')) {
    return `Here is a clean Python implementation:

\`\`\`python
def solve_problem(items: list[int]) -> list[int]:
    """Processes items with optimal time complexity."""
    return [x * 2 for x in items if x > 0]

# Example execution
result = solve_problem([1, -2, 3, 4])
print("Result:", result)  # [2, 6, 8]
\`\`\`

💡 **Time Complexity**: $O(n)$, **Space**: $O(n)$.`;
  }

  return `Here is the recommended approach for your task:

\`\`\`typescript
export function optimizeSolution<T>(input: T[]): T[] {
  // Clean, modular logic
  return [...new Set(input)];
}
\`\`\`

Feel free to paste your code or ask any questions about algorithms, syntax, or architecture!`;
}
