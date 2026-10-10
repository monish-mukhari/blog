interface StoryMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  author: string;
  publishedAt?: string;
}

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !element;
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  const previous = Object.fromEntries(
    Object.keys(attributes).map((key) => [key, element?.getAttribute(key)])
  );
  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
  return () => {
    if (created) element?.remove();
    else {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === null) element?.removeAttribute(key);
        else element?.setAttribute(key, value);
      });
    }
  };
};

export const applyStoryMetadata = ({
  title,
  description,
  canonicalUrl,
  author,
  publishedAt
}: StoryMetadata) => {
  const previousTitle = document.title;
  document.title = `${title} — Inkwell`;

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const canonicalCreated = !canonical;
  const previousCanonical = canonical?.href;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;

  const cleanups = [
    upsertMeta('meta[name="description"]', { name: 'description', content: description }),
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' }),
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title }),
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description }),
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl }),
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' }),
    upsertMeta('meta[name="author"]', { name: 'author', content: author })
  ];
  if (publishedAt) {
    cleanups.push(
      upsertMeta('meta[property="article:published_time"]', {
        property: 'article:published_time',
        content: publishedAt
      })
    );
  }

  return () => {
    document.title = previousTitle;
    cleanups.forEach((cleanup) => cleanup());
    if (canonicalCreated) canonical?.remove();
    else if (canonical && previousCanonical) canonical.href = previousCanonical;
  };
};
