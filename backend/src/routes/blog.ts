import { Prisma } from '@prisma/client/edge';
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { createBlogInput, draftBlogInput, scheduleBlogInput, updateBlogInput } from '@monish21/medium-common';
import {
  calculateReadingTime,
  createMarkdownPreview,
  createStorySlug,
  parseStoryListOptions
} from '../blog-utils';
import { createDatabase } from '../db';
import { publishDraft, publishDueStories, saveRevision } from '../publishing';

type Env = {
  Bindings: { DATABASE_URL: string; JWT_SECRET: string };
  Variables: { userId: string | undefined };
};

export const blogRouter = new Hono<Env>();
const db = createDatabase;

const unauthorized = (message = 'Please sign in to continue.') => ({ error: message });

const learningData = (data: {
  learningOutcomes?: string[];
  prerequisites?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  references?: string[];
  lastReviewedAt?: string | null;
  seriesId?: string | null;
  seriesOrder?: number | null;
}) => ({
  learningOutcomes: data.learningOutcomes || [],
  prerequisites: data.prerequisites || [],
  difficulty: data.difficulty || null,
  references: data.references || [],
  lastReviewedAt: data.lastReviewedAt ? new Date(data.lastReviewedAt) : null,
  seriesId: data.seriesId || null,
  seriesOrder: data.seriesOrder || null
});

const replaceQuiz = async (
  prisma: ReturnType<typeof db>,
  postId: string,
  questions:
    { question: string; options: string[]; correctIndex: number; explanation?: string | null }[] | undefined
) => {
  if (!questions) return;
  await prisma.quizQuestion.deleteMany({ where: { postId } });
  if (questions.length)
    await prisma.quizQuestion.createMany({
      data: questions.map((question, position) => ({
        postId,
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation || null,
        position
      }))
    });
};

const ownsSeries = async (prisma: ReturnType<typeof db>, userId: string, seriesId?: string | null) => {
  if (!seriesId) return true;
  return Boolean(
    await prisma.series.findFirst({ where: { id: seriesId, ownerId: userId }, select: { id: true } })
  );
};

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
  if (!(await ownsSeries(prisma, userId, parsed.data.seriesId)))
    return context.json({ error: 'Choose one of your own learning series.' }, 400);

  const id = crypto.randomUUID();
  const blog = await prisma.post.create({
    data: {
      id,
      slug: createStorySlug(parsed.data.title, id),
      title: parsed.data.title,
      content: parsed.data.content,
      contentFormat: parsed.data.contentFormat,
      excerpt: parsed.data.excerpt || null,
      tags: parsed.data.tags || [],
      coverImageUrl: parsed.data.coverImageUrl || null,
      coverImageAlt: parsed.data.coverImageAlt || null,
      ...learningData(parsed.data),
      published: true,
      publishedAt: new Date(),
      authorId: userId
    }
  });
  await replaceQuiz(prisma, blog.id, parsed.data.quizQuestions);
  return context.json({ id: blog.id, slug: blog.slug }, 201);
});

blogRouter.put('/', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const body = await context.req.json();
  const parsed = updateBlogInput.safeParse(body);
  if (!parsed.success) return context.json({ error: 'Invalid story content.' }, 400);
  if (!(await ownsSeries(prisma, userId, parsed.data.seriesId)))
    return context.json({ error: 'Choose one of your own learning series.' }, 400);

  const existing = await prisma.post.findFirst({
    where: { id: parsed.data.id, authorId: userId }
  });
  if (!existing)
    return context.json({ error: 'Story not found or you do not have permission to edit it.' }, 404);
  if (existing.published) await saveRevision(prisma, existing);

  await prisma.post.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      contentFormat: parsed.data.contentFormat,
      excerpt: parsed.data.excerpt,
      tags: parsed.data.tags,
      coverImageUrl: parsed.data.coverImageUrl || null,
      coverImageAlt: parsed.data.coverImageAlt || null,
      ...learningData(parsed.data)
    }
  });
  await replaceQuiz(prisma, existing.id, parsed.data.quizQuestions);
  return context.json({ message: 'Story updated' });
});

blogRouter.post('/drafts', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const parsed = draftBlogInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Invalid draft content.' }, 400);
  if (!(await ownsSeries(prisma, userId, parsed.data.seriesId)))
    return context.json({ error: 'Choose one of your own learning series.' }, 400);

  const data = {
    title: parsed.data.title,
    content: parsed.data.content,
    contentFormat: parsed.data.contentFormat,
    excerpt: parsed.data.excerpt || null,
    tags: parsed.data.tags || [],
    coverImageUrl: parsed.data.coverImageUrl || null,
    coverImageAlt: parsed.data.coverImageAlt || null,
    ...learningData(parsed.data)
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
    await replaceQuiz(prisma, parsed.data.id, parsed.data.quizQuestions);
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
  await replaceQuiz(prisma, draft.id, parsed.data.quizQuestions);
  return context.json({ draft }, 201);
});

blogRouter.get('/drafts/:id', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const draft = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId, published: false },
    select: {
      id: true,
      title: true,
      content: true,
      contentFormat: true,
      excerpt: true,
      tags: true,
      coverImageUrl: true,
      coverImageAlt: true,
      learningOutcomes: true,
      prerequisites: true,
      difficulty: true,
      references: true,
      lastReviewedAt: true,
      seriesId: true,
      seriesOrder: true,
      quizQuestions: {
        orderBy: { position: 'asc' },
        select: { question: true, options: true, correctIndex: true, explanation: true }
      },
      scheduledAt: true,
      sourcePostId: true,
      updatedAt: true
    }
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
      contentFormat: true,
      tags: true,
      coverImageUrl: true,
      coverImageAlt: true,
      learningOutcomes: true,
      prerequisites: true,
      difficulty: true,
      references: true,
      lastReviewedAt: true,
      seriesId: true,
      seriesOrder: true,
      published: true,
      publishedAt: true,
      scheduledAt: true,
      sourcePostId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { claps: true, bookmarks: true } }
    }
  });

  return context.json({
    posts: posts.map(({ content, _count, ...post }) => ({
      ...post,
      contentPreview: createMarkdownPreview(content),
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

  const current = await prisma.post.findUnique({ where: { id: post.id }, select: { slug: true } });
  if (current?.slug.startsWith('draft-')) {
    await prisma.post.update({
      where: { id: post.id },
      data: { slug: createStorySlug(post.title, post.id) }
    });
  }
  const updated = await publishDraft(prisma, post.id, userId);
  if (!updated) return context.json({ error: 'Draft not found.' }, 404);
  return context.json(updated);
});

blogRouter.get('/manage/:id', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const story = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      contentFormat: true,
      excerpt: true,
      tags: true,
      coverImageUrl: true,
      coverImageAlt: true,
      learningOutcomes: true,
      prerequisites: true,
      difficulty: true,
      references: true,
      lastReviewedAt: true,
      seriesId: true,
      seriesOrder: true,
      quizQuestions: {
        orderBy: { position: 'asc' },
        select: { question: true, options: true, correctIndex: true, explanation: true }
      },
      published: true,
      publishedAt: true,
      scheduledAt: true,
      sourcePostId: true,
      updatedAt: true
    }
  });
  if (!story) return context.json({ error: 'Story not found.' }, 404);
  return context.json({ story });
});

blogRouter.post('/:id/edit', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const source = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId, published: true }
  });
  if (!source) return context.json({ error: 'Published story not found.' }, 404);

  const existing = await prisma.post.findUnique({
    where: { sourcePostId: source.id },
    select: { id: true }
  });
  if (existing) return context.json({ draft: existing });

  const id = crypto.randomUUID();
  const draft = await prisma.post.create({
    data: {
      id,
      slug: `draft-${id.replace(/-/g, '')}`,
      title: source.title,
      content: source.content,
      contentFormat: source.contentFormat,
      excerpt: source.excerpt,
      tags: source.tags,
      coverImageUrl: source.coverImageUrl,
      coverImageAlt: source.coverImageAlt,
      learningOutcomes: source.learningOutcomes,
      prerequisites: source.prerequisites,
      difficulty: source.difficulty,
      references: source.references,
      lastReviewedAt: source.lastReviewedAt,
      seriesId: source.seriesId,
      seriesOrder: source.seriesOrder,
      authorId: userId,
      sourcePostId: source.id
    },
    select: { id: true }
  });
  const questions = await prisma.quizQuestion.findMany({
    where: { postId: source.id },
    orderBy: { position: 'asc' }
  });
  await replaceQuiz(prisma, draft.id, questions);
  return context.json({ draft }, 201);
});

blogRouter.post('/:id/duplicate', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const source = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId }
  });
  if (!source) return context.json({ error: 'Story not found.' }, 404);

  const id = crypto.randomUUID();
  const draft = await prisma.post.create({
    data: {
      id,
      slug: `draft-${id.replace(/-/g, '')}`,
      title: `${source.title} (copy)`.slice(0, 160),
      content: source.content,
      contentFormat: source.contentFormat,
      excerpt: source.excerpt,
      tags: source.tags,
      coverImageUrl: source.coverImageUrl,
      coverImageAlt: source.coverImageAlt,
      learningOutcomes: source.learningOutcomes,
      prerequisites: source.prerequisites,
      difficulty: source.difficulty,
      references: source.references,
      lastReviewedAt: source.lastReviewedAt,
      seriesId: source.seriesId,
      seriesOrder: source.seriesOrder,
      authorId: userId
    },
    select: { id: true }
  });
  const questions = await prisma.quizQuestion.findMany({
    where: { postId: source.id },
    orderBy: { position: 'asc' }
  });
  await replaceQuiz(prisma, draft.id, questions);
  return context.json({ draft }, 201);
});

blogRouter.post('/:id/unpublish', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const prisma = db(context.env.DATABASE_URL);
  const story = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId, published: true }
  });
  if (!story) return context.json({ error: 'Published story not found.' }, 404);
  await saveRevision(prisma, story);
  await prisma.post.update({
    where: { id: story.id },
    data: { published: false, scheduledAt: null }
  });
  return context.json({ id: story.id, status: 'draft' });
});

blogRouter.post('/:id/schedule', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);

  const parsed = scheduleBlogInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Provide a valid publication date and time.' }, 400);
  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (scheduledAt.getTime() <= Date.now() + 60_000) {
    return context.json({ error: 'Schedule publication at least one minute in the future.' }, 400);
  }

  const prisma = db(context.env.DATABASE_URL);
  const story = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId, published: false },
    select: { id: true, slug: true, title: true, content: true }
  });
  if (!story) return context.json({ error: 'Draft not found.' }, 404);
  if (story.title.trim().length < 3 || story.content.trim().length < 20) {
    return context.json({ error: 'Complete the title and story before scheduling.' }, 400);
  }

  await prisma.post.update({
    where: { id: story.id },
    data: {
      slug: story.slug.startsWith('draft-') ? createStorySlug(story.title, story.id) : story.slug,
      scheduledAt
    }
  });
  return context.json({ id: story.id, scheduledAt: scheduledAt.toISOString() });
});

blogRouter.delete('/:id/schedule', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const prisma = db(context.env.DATABASE_URL);
  const result = await prisma.post.updateMany({
    where: { id: context.req.param('id'), authorId: userId, published: false },
    data: { scheduledAt: null }
  });
  if (!result.count) return context.json({ error: 'Scheduled story not found.' }, 404);
  return context.body(null, 204);
});

blogRouter.get('/:id/revisions', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const prisma = db(context.env.DATABASE_URL);
  const story = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId },
    select: { id: true }
  });
  if (!story) return context.json({ error: 'Story not found.' }, 404);
  const revisions = await prisma.postRevision.findMany({
    where: { postId: story.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true }
  });
  return context.json({ revisions });
});

blogRouter.post('/:id/revisions/:revisionId/restore', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const prisma = db(context.env.DATABASE_URL);
  const story = await prisma.post.findFirst({
    where: { id: context.req.param('id'), authorId: userId }
  });
  if (!story) return context.json({ error: 'Story not found.' }, 404);
  const revision = await prisma.postRevision.findFirst({
    where: { id: context.req.param('revisionId'), postId: story.id }
  });
  if (!revision) return context.json({ error: 'Revision not found.' }, 404);

  await saveRevision(prisma, story);
  await prisma.post.update({
    where: { id: story.id },
    data: {
      title: revision.title,
      content: revision.content,
      contentFormat: revision.contentFormat,
      excerpt: revision.excerpt,
      tags: revision.tags,
      coverImageUrl: revision.coverImageUrl,
      coverImageAlt: revision.coverImageAlt,
      learningOutcomes: revision.learningOutcomes,
      prerequisites: revision.prerequisites,
      difficulty: revision.difficulty,
      references: revision.references,
      lastReviewedAt: revision.lastReviewedAt,
      seriesId: revision.seriesId,
      seriesOrder: revision.seriesOrder
    }
  });
  return context.json({ id: story.id, restoredRevisionId: revision.id });
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
  await publishDueStories(prisma);
  const userId = context.get('userId');
  const followingOnly = context.req.query('following') === 'true';
  const { page, limit, search, topic, savedOnly, sort } = parseStoryListOptions({
    page: context.req.query('page'),
    limit: context.req.query('limit'),
    search: context.req.query('search'),
    topic: context.req.query('topic'),
    saved: context.req.query('saved'),
    sort: context.req.query('sort')
  });

  if (savedOnly && !userId) return context.json(unauthorized('Sign in to view your saved stories.'), 401);
  if (followingOnly && !userId)
    return context.json(unauthorized('Sign in to view stories from authors you follow.'), 401);

  const [blocks, mutes] = userId
    ? await Promise.all([
        prisma.userBlock.findMany({
          where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
          select: { blockerId: true, blockedId: true }
        }),
        prisma.userMute.findMany({ where: { muterId: userId }, select: { mutedId: true } })
      ])
    : [[], []];
  const hiddenAuthorIds = [
    ...blocks.map((item) => (item.blockerId === userId ? item.blockedId : item.blockerId)),
    ...mutes.map((item) => item.mutedId)
  ];

  const where: Prisma.PostWhereInput = {
    published: true,
    ...(hiddenAuthorIds.length ? { authorId: { notIn: hiddenAuthorIds } } : {}),
    ...(followingOnly && userId ? { author: { followers: { some: { followerId: userId } } } } : {}),
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
      orderBy:
        sort === 'popular'
          ? [{ claps: { _count: 'desc' } }, { createdAt: 'desc' }]
          : [{ createdAt: sort === 'oldest' ? 'asc' : 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        content: true,
        title: true,
        id: true,
        slug: true,
        excerpt: true,
        tags: true,
        coverImageUrl: true,
        coverImageAlt: true,
        difficulty: true,
        series: { select: { id: true, slug: true, title: true } },
        publishedAt: true,
        createdAt: true,
        author: { select: { id: true, name: true, username: true, headline: true, avatarUrl: true } },
        readingProgress: {
          where: { userId: userId || '__anonymous__' },
          select: { progress: true }
        },
        bookmarks: { where: { userId: userId || '__anonymous__' }, select: { userId: true } },
        claps: { where: { userId: userId || '__anonymous__' }, select: { userId: true } },
        _count: { select: { claps: true } }
      }
    }),
    prisma.post.count({ where })
  ]);

  return context.json({
    blogs: blogs.map(({ bookmarks, claps, _count, content, readingProgress, ...blog }) => ({
      ...blog,
      contentPreview: createMarkdownPreview(content),
      readingTime: calculateReadingTime(content),
      saved: bookmarks.length > 0,
      liked: claps.length > 0,
      clapCount: _count.claps,
      readingProgress: readingProgress[0]?.progress || 0
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
  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: followerId, blockedId: followingId },
        { blockerId: followingId, blockedId: followerId }
      ]
    }
  });
  if (blocked) return context.json({ error: 'This follow relationship is unavailable.' }, 403);
  if (body.followed)
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {}
    });
  else await prisma.follow.deleteMany({ where: { followerId, followingId } });
  if (body.followed)
    await prisma.notification.create({
      data: {
        recipientId: followingId,
        actorId: followerId,
        type: 'follow',
        message: 'A reader started following you.'
      }
    });
  const followerCount = await prisma.follow.count({ where: { followingId } });
  return context.json({ followed: body.followed, followerCount });
});

blogRouter.get('/:identifier', async (context) => {
  const prisma = db(context.env.DATABASE_URL);
  await publishDueStories(prisma);
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
      contentFormat: true,
      excerpt: true,
      tags: true,
      coverImageUrl: true,
      coverImageAlt: true,
      learningOutcomes: true,
      prerequisites: true,
      difficulty: true,
      references: true,
      lastReviewedAt: true,
      seriesId: true,
      seriesOrder: true,
      series: { select: { id: true, slug: true, title: true } },
      quizQuestions: {
        orderBy: { position: 'asc' },
        select: { id: true, question: true, options: true, position: true }
      },
      readingProgress: {
        where: { userId: userId || '__anonymous__' },
        select: { progress: true }
      },
      publishedAt: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          headline: true,
          bio: true,
          avatarUrl: true,
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
  const { bookmarks, claps, _count, author, readingProgress, ...story } = blog;
  const [seriesStories, relatedStories] = await Promise.all([
    blog.seriesId
      ? prisma.post.findMany({
          where: { seriesId: blog.seriesId, published: true },
          orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'asc' }],
          select: { id: true, slug: true, title: true, seriesOrder: true }
        })
      : [],
    prisma.post.findMany({
      where: {
        id: { not: blog.id },
        published: true,
        ...(blog.tags.length ? { tags: { hasSome: blog.tags } } : { authorId: blog.author.id })
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, slug: true, title: true, excerpt: true, coverImageUrl: true }
    })
  ]);
  return context.json({
    blog: {
      ...story,
      saved: bookmarks.length > 0,
      liked: claps.length > 0,
      clapCount: _count.claps,
      readingProgress: readingProgress[0]?.progress || 0,
      seriesStories,
      relatedStories,
      author: {
        id: author.id,
        name: author.name,
        followed: author.followers.length > 0,
        followerCount: author._count.followers
      }
    }
  });
});
