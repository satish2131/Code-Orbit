import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { EditorTheme } from '../../types';

export interface CodeEditorRef {
  dismissKeyboard: () => void;
  insertSnippet: (snippet: string) => void;
}

interface CodeEditorProps {
  code: string;
  language: string;
  theme: EditorTheme;
  onChangeCode: (content: string) => void;
  readOnly?: boolean;
}

export const CodeEditor = React.memo(
  forwardRef<CodeEditorRef, CodeEditorProps>(
    ({ code, language, theme, onChangeCode, readOnly = false }, ref) => {
      const webViewRef = useRef<WebView>(null);
      const lastCodeRef = useRef(code);
      const isTypingRef = useRef(false);
      const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

      useImperativeHandle(ref, () => ({
        dismissKeyboard: () => {
          webViewRef.current?.injectJavaScript(`
            if (window.blurInput) { window.blurInput(); }
          `);
        },
        insertSnippet: (snippet: string) => {
          webViewRef.current?.injectJavaScript(`
            if (window.insertSnippet) { window.insertSnippet(${JSON.stringify(snippet)}); }
          `);
        },
      }));

      useEffect(() => {
        return () => {
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
      }, []);

      useEffect(() => {
        if (code !== lastCodeRef.current && !isTypingRef.current) {
          lastCodeRef.current = code;
          const script = `if (window.setCode) { window.setCode(${JSON.stringify(code)}); }`;
          webViewRef.current?.injectJavaScript(script);
        }
      }, [code]);

      const htmlContent = useMemo(() => {
        return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: ${theme.background};
      font-family: 'Consolas', 'Menlo', 'Fira Code', 'Courier New', monospace;
      -webkit-font-smoothing: antialiased;
    }
    #editor-layout {
      display: flex; width: 100%; height: 100%; position: relative;
    }
    #line-gutter {
      width: 44px; min-width: 44px; height: 100%; overflow: hidden;
      background: rgba(0, 0, 0, 0.2);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      padding: 14px 6px 14px 0; text-align: right;
      user-select: none; -webkit-user-select: none;
      color: rgba(255, 255, 255, 0.28);
      font-size: 13px; line-height: 22px; font-family: inherit;
    }
    .line-num { display: block; height: 22px; }
    #code-area {
      flex: 1; position: relative; height: 100%; overflow: hidden;
    }
    textarea, #highlight-layer {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      padding: 14px 16px; font-size: 14px; line-height: 22px;
      font-family: inherit; white-space: pre; word-wrap: normal;
      overflow: auto; border: none; outline: none; background: transparent;
      tab-size: 2; -moz-tab-size: 2;
    }
    textarea {
      color: transparent; caret-color: #EF4444; z-index: 2; resize: none;
      -webkit-text-fill-color: transparent;
      ${readOnly ? 'pointer-events: none; user-select: none;' : ''}
    }
    #highlight-layer {
      z-index: 1; pointer-events: none; color: ${theme.text};
    }
    .keyword { color: ${theme.keywords}; font-weight: 600; }
    .string { color: ${theme.strings}; }
    .number { color: ${theme.numbers}; }
    .comment { color: ${theme.comments}; font-style: italic; opacity: 0.8; }
    .function { color: ${theme.functions}; }
  </style>
</head>
<body>
  <div id="editor-layout">
    <div id="line-gutter">
      <span class="line-num">1</span>
    </div>
    <div id="code-area">
      <div id="highlight-layer"></div>
      <textarea id="code-input" ${readOnly ? 'readonly="readonly" tabindex="-1"' : ''} spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
    </div>
  </div>
  <script>
    const input = document.getElementById('code-input');
    const layer = document.getElementById('highlight-layer');
    const gutter = document.getElementById('line-gutter');

    function escapeHtml(str) {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function highlight(code) {
      if (!code) return '';
      const escaped = escapeHtml(code);
      const tokenRegex = /(#.*|\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(\\b(?:def|return|import|from|class|if|else|elif|for|while|try|except|with|as|lambda|pass|break|continue|const|let|var|function|async|await|public|private|static|void|int|float|double|boolean|bool|string|None|True|False|true|false|null|undefined|print|console|log|export|default|include|main|package|type|interface)\\b)|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b[a-zA-Z_]\\w*(?=\\())/g;

      return escaped.replace(tokenRegex, (match, comment, str, keyword, num, fn) => {
        if (comment) return '<span class="comment">' + comment + '</span>';
        if (str) return '<span class="string">' + str + '</span>';
        if (keyword) return '<span class="keyword">' + keyword + '</span>';
        if (num) return '<span class="number">' + num + '</span>';
        if (fn) return '<span class="function">' + fn + '</span>';
        return match;
      });
    }

    function updateLineNumbers(code) {
      const lineCount = Math.max(1, (code || '').split('\\n').length);
      let html = '';
      for (let i = 1; i <= lineCount; i++) {
        html += '<span class="line-num">' + i + '</span>';
      }
      gutter.innerHTML = html;
    }

    function update() {
      const val = input.value;
      layer.innerHTML = highlight(val) + '\\n';
      updateLineNumbers(val);
      syncScroll();
    }

    function syncScroll() {
      layer.scrollTop = input.scrollTop;
      layer.scrollLeft = input.scrollLeft;
      gutter.scrollTop = input.scrollTop;
    }

    input.addEventListener('scroll', syncScroll);

    window.blurInput = function() {
      if (input) input.blur();
      if (document.activeElement) document.activeElement.blur();
    };

    window.insertSnippet = function(snippet) {
      if (input.hasAttribute('readonly')) return;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = input.value || '';
      
      let inserted = snippet;
      let cursorOffset = snippet.length;

      if (snippet === 'tab') {
        inserted = '  ';
        cursorOffset = 2;
      } else if (snippet === '()') {
        inserted = '()';
        cursorOffset = 1;
      } else if (snippet === '{}') {
        inserted = '{}';
        cursorOffset = 1;
      } else if (snippet === '[]') {
        inserted = '[]';
        cursorOffset = 1;
      } else if (snippet === '""') {
        inserted = '""';
        cursorOffset = 1;
      } else if (snippet === "''") {
        inserted = "''";
        cursorOffset = 1;
      }

      input.value = val.substring(0, start) + inserted + val.substring(end);
      input.selectionStart = input.selectionEnd = start + cursorOffset;
      update();
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'codeChange', content: input.value }));
    };

    window.setCode = function(val) {
      if (input.value !== val) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = val;
        update();
        try { input.setSelectionRange(start, end); } catch(e){}
      }
    };

    input.value = ${JSON.stringify(code)};
    update();

    input.addEventListener('input', () => {
      if (input.hasAttribute('readonly')) return;
      update();
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'codeChange', content: input.value }));
    });
  </script>
</body>
</html>`;
      }, [theme.id, readOnly]);

      return (
        <View style={styles.container}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webView}
            scrollEnabled={false}
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'codeChange') {
                  isTypingRef.current = true;
                  lastCodeRef.current = data.content;
                  onChangeCode(data.content);
                  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                  typingTimerRef.current = setTimeout(() => {
                    isTypingRef.current = false;
                  }, 200);
                }
              } catch (e) {}
            }}
          />
        </View>
      );
    }
  )
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
