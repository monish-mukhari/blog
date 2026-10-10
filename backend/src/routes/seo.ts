import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono';

type Env = {
  Bindings: { DATABASE_URL: string; FRONTEND_URL?: string };
};

export const seoRouter = new Hono<Env>();
const db = (url: string) => new PrismaClient({ datasourceUrl: url }).$extends(withAccelerate());

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
      const description = post.excerpt || post.content.replace(/\s+/g, ' ').slice(0, 280);
      return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><description>${escapeXml(description)}</description><author>${escapeXml(post.author.name || 'Anonymous')}</author><pubDate>${(post.publishedAt || post.createdAt).toUTCString()}</pubDate></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Inkwell</title><link>${escapeXml(origin)}</link><description>Ideas worth sharing.</description>${items}</channel></rss>`;
  return context.newResponse(xml, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
});

seoRouter.get('/share/:slug', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  const origin = frontendOrigin(context.req.url, context.env.FRONTEND_URL);
  const post = await prisma.post.findFirst({
    where: { slug: context.req.param('slug'), published: true },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      publishedAt: true,
      author: { select: { name: true } }
    }
  });
  if (!post) return context.html('<h1>Story not found</h1>', 404);

  const canonical = `${origin}/story/${post.slug}`;
  const description = post.excerpt || post.content.replace(/\s+/g, ' ').slice(0, 280);
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    datePublished: post.publishedAt?.toISOString(),
    author: { '@type': 'Person', name: post.author.name || 'Anonymous' },
    mainEntityOfPage: canonical
  }).replace(/</g, '\\u003c');

  return context.html(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeXml(post.title)} — Inkwell</title><meta name="description" content="${escapeXml(description)}"><link rel="canonical" href="${escapeXml(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeXml(post.title)}"><meta property="og:description" content="${escapeXml(description)}"><meta property="og:url" content="${escapeXml(canonical)}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${structuredData}</script><meta http-equiv="refresh" content="0;url=${escapeXml(canonical)}"></head><body><p>Opening <a href="${escapeXml(canonical)}">${escapeXml(post.title)}</a>…</p></body></html>`
  );
});
