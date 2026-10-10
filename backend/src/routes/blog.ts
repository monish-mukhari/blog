import { Prisma, PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { createBlogInput, draftBlogInput, updateBlogInput } from '@monish21/medium-common';
import {
  calculateReadingTime,
  createContentPreview,
  createStorySlug,
  parseStoryListOptions
} from '../blog-utils';

type Env = {
  Bindings: { DATABASE_URL: string; JWT_SECRET: string };
  Variables: { userId: string | undefined };
};

export const blogRouter = new Hono<Env>();
const db = (url: string) => new PrismaClient({ datasourceUrl: url }).$extends(withAccelerate());

const unauthorized = (message = 'Please sign in to continue.') => ({ error: message });

// Published stories are public. A valid token enriches responses with the reader's
// bookmark, appreciation, and follow state; invalid or missing tokens remain anonymous.
blogRouter.use('/*', async (context, next) => {
  context.set('userId', undefined);
  const header = context.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    try {
      const payload = await verify(token, context.env.JWT_SECRET, 'HS256');
      if (typeof payload.id === 'string') context.set('userId', payload.id);
    } catch {
      // Reading remains public. Mutation handlers below still require a valid user.
    }
  }
  await next();
});

blogRouter.post('/', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const body = await context.req.json();
  const parsed = createBlogInput.safeParse(body);
  if (!parsed.success) {
    return context.json(
      {
        error: 'Use a title between 3 and 160 characters and story content between 20 and 50,000 characters.'
      },
      400
    );
  }

  const id = crypto.randomUUID();
  const blog = await prisma.post.create({
    data: {
      id,
      slug: createStorySlug(parsed.data.title, id),
      title: parsed.data.title,
      content: parsed.data.content,
      excerpt: parsed.data.excerpt || null,
      tags: parsed.data.tags || [],
      published: true,
      publishedAt: new Date(),
      authorId: userId
    }
  });
  return context.json({ id: blog.id, slug: blog.slug }, 201);
});

blogRouter.put('/', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const body = await context.req.json();
  const parsed = updateBlogInput.safeParse(body);
  if (!parsed.success) return context.json({ error: 'Invalid story content.' }, 400);

  const result = await prisma.post.updateMany({
    where: { id: parsed.data.id, authorId: userId },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      excerpt: parsed.data.excerpt,
      tags: parsed.data.tags
    }
  });
  if (!result.count)
    return context.json({ error: 'Story not found or you do not have permission to edit it.' }, 404);
  return context.json({ message: 'Story updated' });
});

blogRouter.post('/drafts', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const parsed = draftBlogInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Invalid draft content.' }, 400);

  const data = {
    title: parsed.data.title,
    content: parsed.data.content,
    excerpt: parsed.data.excerpt || null,
    tags: parsed.data.tags || []
  };

  if (parsed.data.id) {
    const result = await prisma.post.updateMany({
      where: { id: parsed.data.id, authorId: userId, published: false },
      data
    });
    if (!result.count) return context.json({ error: 'Draft not found.' }, 404);
    const draft = await prisma.post.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, updatedAt: true }
    });
    return context.json({ draft });
  }

  const id = crypto.randomUUID();
  const draft = await prisma.post.create({
    data: {
      id,
      slug: `draft-${id.replace(/-/g, '')}`,
      ...data,
      published: false,
      authorId: userId
    },
    select: { id: true, updatedAt: true }
  });
  return context.json({ draft }, 201);
});

blogRouter.get('/drafts/:id', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const draft = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId, published: false },
    select: { id: true, title: true, content: true, excerpt: true, tags: true, updatedAt: true }
  });
  if (!draft) return context.json({ error: 'Draft not found.' }, 404);
  return context.json({ draft });
});

blogRouter.get('/mine', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const status = context.req.query('status');
  const prisma = db(context.env.DATABASE_URL);
  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      ...(status === 'draft' ? { published: false } : status === 'published' ? { published: true } : {})
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      tags: true,
      published: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { claps: true, bookmarks: true } }
    }
  });

  return context.json({
    posts: posts.map(({ content, _count, ...post }) => ({
      ...post,
      contentPreview: createContentPreview(content),
      readingTime: calculateReadingTime(content),
      clapCount: _count.claps,
      bookmarkCount: _count.bookmarks
    }))
  });
});

blogRouter.post('/:id/publish', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const post = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId, published: false },
    select: { id: true, title: true, content: true }
  });
  if (!post) return context.json({ error: 'Draft not found.' }, 404);
  if (post.title.trim().length < 3 || post.content.trim().length < 20) {
    return context.json({ error: 'Add a clear title and at least a few sentences before publishing.' }, 400);
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      title: post.title.trim(),
      content: post.content.trim(),
      slug: createStorySlug(post.title, post.id),
      published: true,
      publishedAt: new Date()
    },
    select: { id: true, slug: true }
  });
  return context.json(updated);
});

blogRouter.delete('/:id', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const result = await prisma.post.deleteMany({ where: { id: context.req.param('id'), authorId: userId } });
  if (!result.count) return context.json({ error: 'Story not found.' }, 404);
  return context.body(null, 204);
});

blogRouter.get('/bulk', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  const userId = context.get('userId');
  const { page, limit, search, topic, savedOnly } = parseStoryListOptions({
    page: context.req.query('page'),
    limit: context.req.query('limit'),
    search: context.req.query('search'),
    topic: context.req.query('topic'),
    saved: context.req.query('saved')
  });

  if (savedOnly && !userId) return context.json(unauthorized('Sign in to view your saved stories.'), 401);

  const where: Prisma.PostWhereInput = {
    published: true,
    ...(topic ? { tags: { has: topic } } : {}),
    ...(savedOnly && userId ? { bookmarks: { some: { userId } } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { excerpt: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { author: { name: { contains: search, mode: 'insensitive' } } }
          ]
        }
      : {})
  };

  const [blogs, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        content: true,
        title: true,
        id: true,
        slug: true,
        excerpt: true,
        tags: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        bookmarks: { where: { userId: userId || '__anonymous__' }, select: { userId: true } },
        claps: { where: { userId: userId || '__anonymous__' }, select: { userId: true } },
        _count: { select: { claps: true } }
      }
    }),
    prisma.post.count({ where })
  ]);

  return context.json({
    blogs: blogs.map(({ bookmarks, claps, _count, content, ...blog }) => ({
      ...blog,
      contentPreview: createContentPreview(content),
      readingTime: calculateReadingTime(content),
      saved: bookmarks.length > 0,
      liked: claps.length > 0,
      clapCount: _count.claps
    })),
    pagination: { page, limit, total, hasMore: page * limit < total }
  });
});

blogRouter.post('/:id/bookmark', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const postId = context.req.param('id');
  const body = await context.req.json<{ saved?: boolean }>();
  if (typeof body.saved !== 'boolean') return context.json({ error: 'A saved state is required.' }, 400);
  const post = await prisma.post.findFirst({ where: { id: postId, published: true }, select: { id: true } });
  if (!post) return context.json({ error: 'Story not found.' }, 404);
  if (body.saved)
    await prisma.bookmark.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {}
    });
  else await prisma.bookmark.deleteMany({ where: { userId, postId } });
  return context.json({ saved: body.saved });
});

blogRouter.post('/:id/clap', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const postId = context.req.param('id');
  const body = await context.req.json<{ liked?: boolean }>();
  if (typeof body.liked !== 'boolean') return context.json({ error: 'A liked state is required.' }, 400);
  const post = await prisma.post.findFirst({ where: { id: postId, published: true }, select: { id: true } });
  if (!post) return context.json({ error: 'Story not found.' }, 404);
  if (body.liked)
    await prisma.clap.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {}
    });
  else await prisma.clap.deleteMany({ where: { userId, postId } });
  const clapCount = await prisma.clap.count({ where: { postId } });
  return context.json({ liked: body.liked, clapCount });
});

blogRouter.post('/author/:id/follow', async (context) => {
  const followerId = context.get('userId');
  if (!followerId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const followingId = context.req.param('id');
  const body = await context.req.json<{ followed?: boolean }>();
  if (typeof body.followed !== 'boolean')
    return context.json({ error: 'A followed state is required.' }, 400);
  if (followerId === followingId) return context.json({ error: 'You cannot follow yourself.' }, 400);
  const author = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
  if (!author) return context.json({ error: 'Author not found.' }, 404);
  if (body.followed)
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {}
    });
  else await prisma.follow.deleteMany({ where: { followerId, followingId } });
  const followerCount = await prisma.follow.count({ where: { followingId } });
  return context.json({ followed: body.followed, followerCount });
});

blogRouter.get('/:identifier', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  const userId = context.get('userId');
  const blog = await prisma.post.findFirst({
    where: {
      published: true,
      OR: [{ id: context.req.param('identifier') }, { slug: context.req.param('identifier') }]
    },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      tags: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          followers: { where: { followerId: userId || '__anonymous__' }, select: { followerId: true } },
          _count: { select: { followers: true } }
        }
      },
      bookmarks: { where: { userId: userId || '__anonymous__' }, select: { userId: true } },
      claps: { where: { userId: userId || '__anonymous__' }, select: { userId: true } },
      _count: { select: { claps: true } }
    }
  });
  if (!blog) return context.json({ error: 'Story not found.' }, 404);
  const { bookmarks, claps, _count, author, ...story } = blog;
  return context.json({
    blog: {
      ...story,
      saved: bookmarks.length > 0,
      liked: claps.length > 0,
      clapCount: _count.claps,
      author: {
        id: author.id,
        name: author.name,
        followed: author.followers.length > 0,
        followerCount: author._count.followers
      }
    }
  });
});
