import { AIMessage, AIWorkspaceContext } from '../types';

export interface AIProviderCapabilities {
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  capabilities?: AIProviderCapabilities;
  generateResponse(
    prompt: string,
    history: AIMessage[],
    context?: AIWorkspaceContext
  ): Promise<string>;
  generateStream?(
    prompt: string,
    history: AIMessage[],
    onChunk: (chunk: string) => void,
    context?: AIWorkspaceContext
  ): Promise<void>;
}

/**
 * Default AI Assistant Provider implementation
 * Provider-agnostic abstraction layer ready for LLM APIs (Gemini / OpenAI / Claude)
 */
class DefaultCodeOrbitAIProvider implements AIProvider {
  id = 'codeorbit-default';
  name = 'CodeOrbit Core Assistant';
  capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  };

  async generateResponse(
    prompt: string,
    history: AIMessage[],
    context?: AIWorkspaceContext
  ): Promise<string> {
    const lowerMsg = prompt.toLowerCase();

    // Context-aware enrichment if workspace metadata is supplied
    let contextHeader = '';
    if (context?.languagePreset || context?.currentFilename) {
      contextHeader = `[Context: ${context.languagePreset || 'code'} | File: ${context.currentFilename || 'untitled'}]\n\n`;
    }

    if (lowerMsg.includes('async') || lowerMsg.includes('await') || lowerMsg.includes('promise')) {
      return (
        contextHeader +
        "⚡ **Async/Await in JavaScript/TypeScript:**\n\n`async/await` is modern syntax for handling asynchronous promises in a synchronous-looking style.\n\n```javascript\nasync function fetchUserData(userId) {\n  try {\n    const response = await fetch(`https://api.example.com/users/${userId}`);\n    if (!response.ok) throw new Error('User not found');\n    \n    const user = await response.json();\n    return user;\n  } catch (error) {\n    console.error('Failed to fetch user:', error);\n  }\n}\n```\n\n💡 **Key Takeaways:**\n1. `async` functions always return a Promise.\n2. `await` pauses execution until the Promise settles.\n3. Always wrap `await` calls in `try...catch` blocks for clean error handling."
      );
    }

    if (lowerMsg.includes('debug') || lowerMsg.includes('error') || lowerMsg.includes('bug') || lowerMsg.includes('fix')) {
      return (
        contextHeader +
        "🐞 **Debugging Checklist & Strategy:**\n\n1. **Inspect Console Logs:** Output raw inputs/outputs before and after the failing logic.\n2. **Verify Types & Mutability:** Check for `undefined` or `null` property access.\n3. **Isolate Scope:** Test the function independently with sample data.\n4. **Handle Asynchronous Timing:** Ensure promises resolve before reading variables.\n\nPaste your code snippet here and I'll debug it for you line by line!"
      );
    }

    if (lowerMsg.includes('react') || lowerMsg.includes('hooks') || lowerMsg.includes('component')) {
      return (
        contextHeader +
        "⚛️ **React Core Best Practices:**\n\n1. **Keep Components Small & Pure:** Render UI based strictly on props & state.\n2. **Use Custom Hooks:** Extract non-UI business logic out of components.\n3. **Optimize Re-renders:** Wrap heavy calculations in `useMemo` and functions in `useCallback`.\n4. **State Co-location:** Keep state as close to where it's used as possible.\n5. **Key Prop:** Always provide a stable, unique `key` when mapping arrays."
      );
    }

    if (lowerMsg.includes('python') || lowerMsg.includes('javascript') || lowerMsg.includes('compare')) {
      return (
        contextHeader +
        "🐍 vs 📜 **Python vs JavaScript Comparison:**\n\n• **Python**: Clean indentation syntax, ideal for AI/ML, data science, scripting & backend (Django/FastAPI).\n• **JavaScript**: Event-driven, non-blocking, runs natively in browsers, Node.js, and React Native.\n\n```python\n# Python List Comprehension\nsquares = [x**2 for x in range(10) if x % 2 == 0]\n```\n\n```javascript\n// JavaScript Array Filter & Map\nconst squares = Array.from({length: 10}, (_, i) => i)\n  .filter(x => x % 2 === 0)\n  .map(x => x ** 2);\n```"
      );
    }

    if (lowerMsg.includes('binary search') || lowerMsg.includes('search') || lowerMsg.includes('algorithm')) {
      return (
        contextHeader +
        "🚀 **Binary Search Algorithm (O(log n) Time):**\n\n```typescript\nfunction binarySearch(arr: number[], target: number): number {\n  let left = 0;\n  let right = arr.length - 1;\n\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    \n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n\n  return -1; // Target not found\n}\n```\n\n⏱️ **Complexity:** Time: `O(log n)`, Space: `O(1)`. Requires a sorted array!"
      );
    }

    return (
      contextHeader +
      "Great question! Here is how to approach this in code:\n\n1. Break the problem into small modular functions.\n2. Write clean, readable code with descriptive variable names.\n3. Handle edge cases (empty inputs, null values, type mismatches).\n\nFeel free to share your code or ask about specific syntax, algorithms, or framework patterns!"
    );
  }

  async generateStream(
    prompt: string,
    history: AIMessage[],
    onChunk: (chunk: string) => void,
    context?: AIWorkspaceContext
  ): Promise<void> {
    const fullResponse = await this.generateResponse(prompt, history, context);
    const words = fullResponse.split(' ');
    for (const word of words) {
      onChunk(word + ' ');
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
}

export const aiService: AIProvider = new DefaultCodeOrbitAIProvider();
