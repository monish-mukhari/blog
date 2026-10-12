import { Hono } from 'hono';
import { createMarkdownPreview } from '../blog-utils';
import { createDatabase } from '../db';
import { escapeHtml, renderMarkdown } from '../markdown';
import { publishDueStories } from '../publishing';

type Env = {
  Bindings: { DATABASE_URL: string; FRONTEND_URL?: string };
};

export const seoRouter = new Hono<Env>();
const db = createDatabase;

const escapeXml = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;'
    };
    return entities[character];
  });

const frontendOrigin = (requestUrl: string, configuredOrigin?: string) =>
  (configuredOrigin || new URL(requestUrl).origin).replace(/\/$/, '');

seoRouter.get('/sitemap.xml', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  await publishDueStories(prisma);
  const origin = frontendOrigin(context.req.url, context.env.FRONTEND_URL);
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { updatedAt: 'desc' },
    select: { slug: true, updatedAt: true }
  });
  const urls = posts
    .map(
      (post) =>
        `<url><loc>${escapeXml(`${origin}/story/${post.slug}`)}</loc><lastmod>${post.updatedAt.toISOString()}</lastmod></url>`
    )
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeXml(origin)}</loc></url><url><loc>${escapeXml(`${origin}/blogs`)}</loc></url>${urls}</urlset>`;
  return context.newResponse(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

seoRouter.get('/rss.xml', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  await publishDueStories(prisma);
  const origin = frontendOrigin(context.req.url, context.env.FRONTEND_URL);
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      publishedAt: true,
      createdAt: true,
      author: { select: { name: true } }
    }
  });
  const items = posts
    .map((post) => {
      const url = `${origin}/story/${post.slug}`;
      const description = post.excerpt || createMarkdownPreview(post.content).slice(0, 280);
      return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><description>${escapeXml(description)}</description><author>${escapeXml(post.author.name || 'Anonymous')}</author><pubDate>${(post.publishedAt || post.createdAt).toUTCString()}</pubDate></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Inkwell</title><link>${escapeXml(origin)}</link><description>Ideas worth sharing.</description>${items}</channel></rss>`;
  return context.newResponse(xml, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
});

const storySelection = {
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  contentFormat: true,
  coverImageUrl: true,
  coverImageAlt: true,
  learningOutcomes: true,
  prerequisites: true,
  difficulty: true,
  publishedAt: true,
  updatedAt: true,
  author: { select: { name: true, username: true } }
} as const;

const storyDocument = (
  post: {
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    contentFormat: string;
    coverImageUrl: string | null;
    coverImageAlt: string | null;
    learningOutcomes: string[];
    prerequisites: string[];
    difficulty: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    author: { name: string | null; username: string | null };
  },
  origin: string,
  redirect: boolean
) => {
  const canonical = `${origin}/story/${post.slug}`;
  const description = post.excerpt || createMarkdownPreview(post.content).slice(0, 280);
  const image = post.coverImageUrl || `${origin}/og-default.png`;
  const author = post.author.name || 'Anonymous';
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': ['Article', 'LearningResource'],
    headline: post.title,
    description,
    image: [image],
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: author,
      ...(post.author.username ? { url: `${origin}/author/${post.author.username}` } : {})
    },
    learningResourceType: 'Article',
    educationalLevel: post.difficulty || undefined,
    teaches: post.learningOutcomes.length ? post.learningOutcomes : undefined,
    educationalUse: post.prerequisites.length ? 'Self study with prerequisites' : 'Self study',
    mainEntityOfPage: canonical
  }).replace(/</g, '\\u003c');
  const content =
    post.contentFormat === 'markdown' ? renderMarkdown(post.content) : `<p>${escapeHtml(post.content)}</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeXml(post.title)} — Inkwell</title>
  <meta name="description" content="${escapeXml(description)}">
  <meta name="author" content="${escapeXml(author)}">
  <link rel="canonical" href="${escapeXml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeXml(post.title)}">
  <meta property="og:description" content="${escapeXml(description)}">
  <meta property="og:url" content="${escapeXml(canonical)}">
  <meta property="og:image" content="${escapeXml(image)}">
  <meta property="article:published_time" content="${post.publishedAt?.toISOString() || ''}">
  <meta property="article:modified_time" content="${post.updatedAt.toISOString()}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeXml(post.title)}">
  <meta name="twitter:description" content="${escapeXml(description)}">
  <meta name="twitter:image" content="${escapeXml(image)}">
  <script type="application/ld+json">${structuredData}</script>
  ${redirect ? `<meta http-equiv="refresh" content="0;url=${escapeXml(canonical)}">` : ''}
  <style>
    :root{font-family:ui-sans-serif,system-ui,sans-serif;color:#10213d;background:#fff}body{margin:0}nav,main{width:min(760px,calc(100% - 40px));margin:auto}nav{padding:24px 0;border-bottom:1px solid #d9e3f3}nav a{color:#2563eb;text-decoration:none;font-weight:700}header{padding:64px 0 36px;text-align:center}h1{font-family:Georgia,serif;font-size:clamp(2.5rem,8vw,5rem);line-height:1;margin:.25em 0}header p{color:#64748b;font-size:1.1rem;line-height:1.7}.cover{width:100%;max-height:520px;object-fit:cover;border-radius:18px}.article{font-family:Georgia,serif;font-size:1.2rem;line-height:1.85;padding:42px 0 80px}.article h2,.article h3{line-height:1.2;margin-top:2em}.article a{color:#2563eb}.article img{display:block;max-width:100%;margin:2rem auto;border-radius:14px}.article figcaption{text-align:center;color:#64748b;font:14px ui-sans-serif,system-ui}.article blockquote{border-left:4px solid #2563eb;margin:2rem 0;padding:.5rem 1.5rem;color:#475569}.article pre{overflow:auto;background:#10213d;color:#f8fafc;padding:1.25rem;border-radius:12px}.article code{font-size:.9em}
  </style>
</head>
<body>
  <nav><a href="${escapeXml(origin)}">Inkwell</a></nav>
  <main>
    <header><p>Published by ${escapeXml(author)}</p><h1>${escapeXml(post.title)}</h1><p>${escapeXml(description)}</p></header>
    ${post.coverImageUrl ? `<img class="cover" src="${escapeXml(post.coverImageUrl)}" alt="${escapeXml(post.coverImageAlt || '')}">` : ''}
    <article class="article">${content}</article>
  </main>
</body>
</html>`;
};

seoRouter.get('/render/:slug', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  await publishDueStories(prisma);
  const post = await prisma.post.findFirst({
    where: { slug: context.req.param('slug'), published: true },
    select: storySelection
  });
  if (!post) return context.html('<h1>Story not found</h1>', 404);
  return context.html(storyDocument(post, frontendOrigin(context.req.url, context.env.FRONTEND_URL), false));
});

seoRouter.get('/share/:slug', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  await publishDueStories(prisma);
  const origin = frontendOrigin(context.req.url, context.env.FRONTEND_URL);
  const post = await prisma.post.findFirst({
    where: { slug: context.req.param('slug'), published: true },
    select: storySelection
  });
  if (!post) return context.html('<h1>Story not found</h1>', 404);
  return context.html(storyDocument(post, origin, true));
});
