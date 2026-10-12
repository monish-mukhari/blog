import { Hono } from 'hono';
import { progressInput, quizAttemptInput, readerNoteInput, seriesInput } from '@monish21/medium-common';
import { createDatabase } from '../db';
import { createStorySlug } from '../blog-utils';
import { readUserId } from '../request-auth';

type Env = {
  Bindings: { DATABASE_URL: string; JWT_SECRET: string };
  Variables: { userId: string | undefined };
};

export const learningRouter = new Hono<Env>();

learningRouter.use('/*', async (context, next) => {
  context.set('userId', await readUserId(context.req.header('Authorization'), context.env.JWT_SECRET));
  await next();
});

const requireUser = (userId: string | undefined) =>
  userId ? null : ({ error: 'Please sign in to use learning tools.' } as const);

learningRouter.get('/series/mine', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const series = await createDatabase(context.env.DATABASE_URL).series.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { posts: true } } }
  });
  return context.json({ series });
});

learningRouter.post('/series', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const parsed = seriesInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Provide a valid series title and description.' }, 400);
  const id = crypto.randomUUID();
  const series = await createDatabase(context.env.DATABASE_URL).series.create({
    data: {
      id,
      ownerId: userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      slug: createStorySlug(parsed.data.title, id)
    }
  });
  return context.json({ series }, 201);
});

learningRouter.put('/series/:id', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const parsed = seriesInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Provide a valid series title and description.' }, 400);
  const result = await createDatabase(context.env.DATABASE_URL).series.updateMany({
    where: { id: context.req.param('id'), ownerId: userId },
    data: { title: parsed.data.title, description: parsed.data.description || null }
  });
  if (!result.count) return context.json({ error: 'Series not found.' }, 404);
  return context.json({ updated: true });
});

learningRouter.delete('/series/:id', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const result = await createDatabase(context.env.DATABASE_URL).series.deleteMany({
    where: { id: context.req.param('id'), ownerId: userId }
  });
  if (!result.count) return context.json({ error: 'Series not found.' }, 404);
  return context.body(null, 204);
});

learningRouter.put('/stories/:postId/progress', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const parsed = progressInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Progress must be between zero and one.' }, 400);
  const postId = context.req.param('postId');
  const prisma = createDatabase(context.env.DATABASE_URL);
  const post = await prisma.post.findFirst({ where: { id: postId, published: true }, select: { id: true } });
  if (!post) return context.json({ error: 'Story not found.' }, 404);
  const progress = await prisma.readingProgress.upsert({
    where: { userId_postId: { userId, postId } },
    create: {
      userId,
      postId,
      progress: parsed.data.progress,
      completedAt: parsed.data.progress >= 0.95 ? new Date() : null
    },
    update: {
      progress: parsed.data.progress,
      completedAt: parsed.data.progress >= 0.95 ? new Date() : null
    }
  });
  return context.json({ progress });
});

learningRouter.get('/continue', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const items = await createDatabase(context.env.DATABASE_URL).readingProgress.findMany({
    where: { userId, progress: { gt: 0, lt: 0.95 }, post: { published: true } },
    orderBy: { updatedAt: 'desc' },
    take: 12,
    select: {
      progress: true,
      updatedAt: true,
      post: {
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          author: { select: { id: true, name: true, username: true } }
        }
      }
    }
  });
  return context.json({ items });
});

learningRouter.get('/stories/:postId/notes', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const notes = await createDatabase(context.env.DATABASE_URL).readerNote.findMany({
    where: { userId, postId: context.req.param('postId') },
    orderBy: { createdAt: 'desc' }
  });
  return context.json({ notes });
});

learningRouter.post('/stories/:postId/notes', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const parsed = readerNoteInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Add a note of up to 2,000 characters.' }, 400);
  const postId = context.req.param('postId');
  const prisma = createDatabase(context.env.DATABASE_URL);
  const post = await prisma.post.findFirst({ where: { id: postId, published: true }, select: { id: true } });
  if (!post) return context.json({ error: 'Story not found.' }, 404);
  const note = await prisma.readerNote.create({ data: { userId, postId, ...parsed.data } });
  return context.json({ note }, 201);
});

learningRouter.delete('/notes/:id', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const result = await createDatabase(context.env.DATABASE_URL).readerNote.deleteMany({
    where: { id: context.req.param('id'), userId }
  });
  if (!result.count) return context.json({ error: 'Note not found.' }, 404);
  return context.body(null, 204);
});

learningRouter.post('/quiz/:questionId/attempt', async (context) => {
  const userId = context.get('userId');
  const error = requireUser(userId);
  if (error || !userId) return context.json(error!, 401);
  const parsed = quizAttemptInput.safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Choose a valid answer.' }, 400);
  const prisma = createDatabase(context.env.DATABASE_URL);
  const question = await prisma.quizQuestion.findFirst({
    where: { id: context.req.param('questionId'), post: { published: true } }
  });
  if (!question || parsed.data.answer >= question.options.length)
    return context.json({ error: 'Question not found.' }, 404);
  const correct = parsed.data.answer === question.correctIndex;
  await prisma.quizAttempt.create({
    data: { userId, questionId: question.id, answer: parsed.data.answer, correct }
  });
  return context.json({ correct, correctIndex: question.correctIndex, explanation: question.explanation });
});
