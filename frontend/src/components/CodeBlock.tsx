import { useEffect, useRef, useState } from 'react';

type HighlightToken = {
  color?: string;
  content: string;
  fontStyle?: number;
};

type HighlightResult = {
  background: string;
  foreground: string;
  tokens: HighlightToken[][];
};

const highlightCache = new Map<string, Promise<HighlightResult>>();
const HIGHLIGHT_CACHE_LIMIT = 100;

const languageNames: Record<string, string> = {
  bash: 'Bash',
  css: 'CSS',
  html: 'HTML',
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  json: 'JSON',
  md: 'Markdown',
  markdown: 'Markdown',
  prisma: 'Prisma',
  py: 'Python',
  python: 'Python',
  sh: 'Shell',
  shell: 'Shell',
  sql: 'SQL',
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML'
};

const loadHighlight = (code: string, language: string) => {
  const cacheKey = `${language}\u0000${code}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;

  const highlighted: Promise<HighlightResult> = import('../lib/syntax-highlighter').then(
    async ({ highlightCode }) => {
      const result = await highlightCode(code, language);

      return {
        background: result.bg || '#0d1117',
        foreground: result.fg || '#e6edf3',
        tokens: result.tokens
      };
    }
  );

  highlightCache.set(cacheKey, highlighted);
  if (highlightCache.size > HIGHLIGHT_CACHE_LIMIT) {
    const oldestKey = highlightCache.keys().next().value;
    if (oldestKey) highlightCache.delete(oldestKey);
  }
  return highlighted;
};

const tokenStyle = (token: HighlightToken) => ({
  color: token.color,
  fontStyle: token.fontStyle && token.fontStyle & 1 ? 'italic' : undefined,
  fontWeight: token.fontStyle && token.fontStyle & 2 ? 700 : undefined,
  textDecoration: token.fontStyle && token.fontStyle & 4 ? 'underline' : undefined
});

export const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [highlight, setHighlight] = useState<HighlightResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimer = useRef<number>();
  const normalizedLanguage = language.toLowerCase();
  const label = languageNames[normalizedLanguage] || (language ? language.toUpperCase() : 'Text');
  const lineCount = code.split('\n').length;
  const showLineNumbers = lineCount >= 8;

  useEffect(() => {
    let active = true;
    setHighlight(null);
    loadHighlight(code, normalizedLanguage).then((result) => {
      if (active) setHighlight(result);
    });
    return () => {
      active = false;
    };
  }, [code, normalizedLanguage]);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  const copyCode = async () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    resetTimer.current = window.setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <figure className="code-block">
      <figcaption className="code-block-toolbar">
        <span className="code-block-language">{label}</span>
        <button className="code-block-copy" type="button" onClick={copyCode}>
          {copyStatus === 'copied' ? (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m5 12 4 4L19 6" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <rect x="8" y="8" width="11" height="11" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </svg>
          )}
          <span>
            {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'failed' ? 'Copy failed' : 'Copy'}
          </span>
        </button>
        <span className="sr-only" aria-live="polite">
          {copyStatus === 'copied'
            ? 'Code copied to clipboard.'
            : copyStatus === 'failed'
              ? 'Could not copy code to clipboard.'
              : ''}
        </span>
      </figcaption>
      <div className="code-block-scroll" style={{ background: highlight?.background }}>
        <pre style={{ color: highlight?.foreground }}>
          <code className={showLineNumbers ? 'has-line-numbers' : undefined}>
            {highlight
              ? highlight.tokens.map((line, lineIndex) => (
                  <span className="code-block-line" key={lineIndex}>
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} style={tokenStyle(token)}>
                        {token.content}
                      </span>
                    ))}
                    {lineIndex < highlight.tokens.length - 1 ? '\n' : null}
                  </span>
                ))
              : code}
          </code>
        </pre>
      </div>
    </figure>
  );
};
