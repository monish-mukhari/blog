export interface StoryListQuery {
  page?: string;
  limit?: string;
  search?: string;
  topic?: string;
  saved?: string;
}

export interface StoryListOptions {
  page: number;
  limit: number;
  search: string;
  topic: string;
  savedOnly: boolean;
}

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback;
};

export const parseStoryListOptions = (query: StoryListQuery): StoryListOptions => ({
  page: parsePositiveInteger(query.page, 1),
  limit: Math.min(24, parsePositiveInteger(query.limit, 12)),
  search: (query.search || '').trim().slice(0, 100),
  topic: (query.topic || '').trim().slice(0, 30),
  savedOnly: query.saved === 'true'
});

export const calculateReadingTime = (content: string) =>
  Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 220));

export const createContentPreview = (content: string) => content.replace(/\s+/g, ' ').trim().slice(0, 240);

export const createStorySlug = (title: string, id: string) => {
  const readable = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  const suffix = id.replace(/-/g, '').slice(0, 10).toLowerCase();
  return `${readable || 'story'}-${suffix}`;
};
