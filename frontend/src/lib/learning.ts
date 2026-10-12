export interface ArticleHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'section';

export const extractHeadings = (markdown: string): ArticleHeading[] => {
  const counts = new Map<string, number>();
  return markdown
    .split('\n')
    .map((line) => line.match(/^(##|###)\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = match[2].replace(/[`*_~[\]]/g, '').trim();
      const base = headingId(text);
      const count = counts.get(base) || 0;
      counts.set(base, count + 1);
      return { id: count ? `${base}-${count + 1}` : base, text, level: match[1].length as 2 | 3 };
    });
};

export const linesToList = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
