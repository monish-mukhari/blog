import { createHighlighterCore, type LanguageInput } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubDarkDefault from 'shiki/themes/github-dark-default.mjs';

const languageAliases: Record<string, string> = {
  js: 'javascript',
  md: 'markdown',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  yml: 'yaml'
};

const languageLoaders: Record<string, () => Promise<LanguageInput>> = {
  bash: () => import('shiki/langs/bash.mjs').then((module) => module.default),
  cpp: () => import('shiki/langs/cpp.mjs').then((module) => module.default),
  csharp: () => import('shiki/langs/csharp.mjs').then((module) => module.default),
  css: () => import('shiki/langs/css.mjs').then((module) => module.default),
  go: () => import('shiki/langs/go.mjs').then((module) => module.default),
  html: () => import('shiki/langs/html.mjs').then((module) => module.default),
  java: () => import('shiki/langs/java.mjs').then((module) => module.default),
  javascript: () => import('shiki/langs/javascript.mjs').then((module) => module.default),
  jsx: () => import('shiki/langs/jsx.mjs').then((module) => module.default),
  json: () => import('shiki/langs/json.mjs').then((module) => module.default),
  markdown: () => import('shiki/langs/markdown.mjs').then((module) => module.default),
  php: () => import('shiki/langs/php.mjs').then((module) => module.default),
  prisma: () => import('shiki/langs/prisma.mjs').then((module) => module.default),
  python: () => import('shiki/langs/python.mjs').then((module) => module.default),
  rust: () => import('shiki/langs/rust.mjs').then((module) => module.default),
  sql: () => import('shiki/langs/sql.mjs').then((module) => module.default),
  tsx: () => import('shiki/langs/tsx.mjs').then((module) => module.default),
  typescript: () => import('shiki/langs/typescript.mjs').then((module) => module.default),
  xml: () => import('shiki/langs/xml.mjs').then((module) => module.default),
  yaml: () => import('shiki/langs/yaml.mjs').then((module) => module.default)
};

const highlighter = createHighlighterCore({
  themes: [githubDarkDefault],
  langs: [],
  engine: createJavaScriptRegexEngine()
});
const loadingLanguages = new Map<string, Promise<void>>();

export const highlightCode = async (code: string, language: string) => {
  const instance = await highlighter;
  const canonicalLanguage = languageAliases[language] || language;
  const loader = languageLoaders[canonicalLanguage];

  if (loader && !instance.getLoadedLanguages().includes(canonicalLanguage)) {
    let loading = loadingLanguages.get(canonicalLanguage);
    if (!loading) {
      loading = loader().then((registration) => instance.loadLanguage(registration));
      loadingLanguages.set(canonicalLanguage, loading);
    }
    await loading;
  }

  const selectedLanguage = instance.getLoadedLanguages().includes(canonicalLanguage)
    ? canonicalLanguage
    : 'text';

  return instance.codeToTokens(code, {
    lang: selectedLanguage,
    theme: 'github-dark-default'
  });
};
