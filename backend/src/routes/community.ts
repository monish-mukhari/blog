import { Hono } from 'hono';
import { commentInput, profileInput, reportInput } from '@monish21/medium-common';
import { createDatabase } from '../db';
import { readUserId } from '../request-auth';

type Env = {
  Bindings: { DATABASE_URL: string; JWT_SECRET: string };
  Variables: { userId: string | undefined };
};

export const communityRouter = new Hono<Env>();

communityRouter.use('/*', async (context, next) => {
  context.set('userId', await readUserId(context.req.header('Authorization'), context.env.JWT_SECRET));
  await next();
});

const unauthorized = () => ({ error: 'Please sign in to continue.' }) as const;
const publicProfileSelect = {
  id: true,
  username: true,
  name: true,
  headline: true,
  bio: true,
  avatarUrl: true,
  website: true,
  location: true,
  createdAt: true,
  _count: { select: { posts: { where: { published: true } }, followers: true, following: true } }
} as const;

communityRouter.get('/profile/me', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const profile = await createDatabase(context.env.DATABASE_URL).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      headline: true,
      bio: true,
      avatarUrl: true,
      website: true,
      location: true,
      digestFrequency: true
    }
  });
  return context.json({ profile });
});

communityRouter.put('/profile/me', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const parsed = profileInput.safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: 'Check your username, profile text, URLs, and digest preference.' }, 400);
  const prisma = createDatabase(context.env.DATABASE_URL);
  const taken = await prisma.user.findFirst({
    where: { username: parsed.data.username, NOT: { id: userId } },
    select: { id: true }
  });
  if (taken) return context.json({ error: 'That username is already taken.' }, 409);
  const profile = await prisma.user.update({
    where: { id: userId },
    data: {
      ...parsed.data,
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
      avatarUrl: parsed.data.avatarUrl || null,
      website: parsed.data.website || null,
      location: parsed.data.location || null
    },
    select: publicProfileSelect
  });
  return context.json({ profile });
});

communityRouter.get('/profile/:identifier', async (context) => {
  const viewerId = context.get('userId');
  const identifier = context.req.param('identifier').toLowerCase();
  const prisma = createDatabase(context.env.DATABASE_URL);
  const profile = await prisma.user.findFirst({
    where: { OR: [{ id: identifier }, { username: identifier }] },
    select: {
      ...publicProfileSelect,
      followers: {
        where: { followerId: viewerId || '__anonymous__' },
        select: { followerId: true }
      },
      blockedBy: {
        where: { blockerId: viewerId || '__anonymous__' },
        select: { blockerId: true }
      },
      mutedBy: {
        where: { muterId: viewerId || '__anonymous__' },
        select: { muterId: true }
      }
    }
  });
  if (!profile) return context.json({ error: 'Author not found.' }, 404);
  const { followers, blockedBy, mutedBy, ...details } = profile;
  return context.json({
    profile: {
      ...details,
      followed: followers.length > 0,
      blocked: blockedBy.length > 0,
      muted: mutedBy.length > 0,
      isOwn: viewerId === profile.id
    }
  });
});

communityRouter.get('/profile/:identifier/stories', async (context) => {
  const identifier = context.req.param('identifier').toLowerCase();
  const prisma = createDatabase(context.env.DATABASE_URL);
  const author = await prisma.user.findFirst({
    where: { OR: [{ id: identifier }, { username: identifier }] },
    select: { id: true }
  });
  if (!author) return context.json({ error: 'Author not found.' }, 404);
  const stories = await prisma.post.findMany({
    where: { authorId: author.id, published: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      tags: true,
      coverImageUrl: true,
      publishedAt: true,
      _count: { select: { claps: true, comments: true } }
    }
  });
  return context.json({ stories });
});

communityRouter.get('/posts/:postId/comments', async (context) => {
  const viewerId = context.get('userId');
  const prisma = createDatabase(context.env.DATABASE_URL);
  const hiddenUsers = viewerId
    ? await prisma.user.findUnique({
        where: { id: viewerId },
        select: {
          blocking: { select: { blockedId: true } },
          blockedBy: { select: { blockerId: true } },
          muting: { select: { mutedId: true } }
        }
      })
    : null;
  const excluded = [
    ...(hiddenUsers?.blocking.map((item) => item.blockedId) || []),
    ...(hiddenUsers?.blockedBy.map((item) => item.blockerId) || []),
    ...(hiddenUsers?.muting.map((item) => item.mutedId) || [])
  ];
  const comments = await prisma.comment.findMany({
    where: {
      postId: context.req.param('postId'),
      status: { in: ['visible', 'removed'] },
      ...(excluded.length ? { authorId: { notIn: excluded } } : {})
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      body: true,
      status: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, username: true, name: true, avatarUrl: true } }
    }
  });
  return context.json({ comments });
});

communityRouter.post('/posts/:postId/comments', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const parsed = commentInput.safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: 'Comments must be between 1 and 3,000 characters.' }, 400);
  const postId = context.req.param('postId');
  const prisma = createDatabase(context.env.DATABASE_URL);
  const post = await prisma.post.findFirst({
    where: { id: postId, published: true },
    select: { id: true, authorId: true, title: true }
  });
  if (!post) return context.json({ error: 'Story not found.' }, 404);
  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: post.authorId },
        { blockerId: post.authorId, blockedId: userId }
      ]
    }
  });
  if (blocked) return context.json({ error: 'You cannot comment in this conversation.' }, 403);
  let parent: { id: string; authorId: string } | null = null;
  if (parsed.data.parentId) {
    parent = await prisma.comment.findFirst({
      where: { id: parsed.data.parentId, postId },
      select: { id: true, authorId: true }
    });
    if (!parent) return context.json({ error: 'The comment you replied to was not found.' }, 404);
  }
  const comment = await prisma.comment.create({
    data: { authorId: userId, postId, body: parsed.data.body, parentId: parent?.id },
    select: {
      id: true,
      body: true,
      status: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, username: true, name: true, avatarUrl: true } }
    }
  });
  const recipients = new Map<string, { type: string; message: string }>();
  if (post.authorId !== userId)
    recipients.set(post.authorId, { type: 'comment', message: `New discussion on “${post.title}”` });
  if (parent && parent.authorId !== userId)
    recipients.set(parent.authorId, { type: 'reply', message: 'Someone replied to your comment.' });
  const usernames = [...new Set(parsed.data.body.match(/@[a-z0-9_]{3,30}/gi) || [])].map((value) =>
    value.slice(1).toLowerCase()
  );
  if (usernames.length) {
    const mentioned = await prisma.user.findMany({
      where: { username: { in: usernames }, NOT: { id: userId } },
      select: { id: true }
    });
    for (const user of mentioned)
      recipients.set(user.id, { type: 'mention', message: 'You were mentioned in a discussion.' });
  }
  if (recipients.size)
    await prisma.notification.createMany({
      data: [...recipients].map(([recipientId, value]) => ({
        recipientId,
        actorId: userId,
        postId,
        commentId: comment.id,
        ...value
      }))
    });
  return context.json({ comment }, 201);
});

communityRouter.patch('/comments/:id', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const parsed = commentInput.pick({ body: true }).safeParse(await context.req.json());
  if (!parsed.success) return context.json({ error: 'Enter a valid comment.' }, 400);
  const result = await createDatabase(context.env.DATABASE_URL).comment.updateMany({
    where: { id: context.req.param('id'), authorId: userId, status: 'visible' },
    data: { body: parsed.data.body }
  });
  if (!result.count) return context.json({ error: 'Comment not found.' }, 404);
  return context.json({ updated: true });
});

communityRouter.delete('/comments/:id', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const prisma = createDatabase(context.env.DATABASE_URL);
  const comment = await prisma.comment.findUnique({
    where: { id: context.req.param('id') },
    select: { authorId: true, post: { select: { authorId: true } } }
  });
  if (!comment || (comment.authorId !== userId && comment.post.authorId !== userId))
    return context.json({ error: 'Comment not found or you cannot moderate it.' }, 404);
  await prisma.comment.update({
    where: { id: context.req.param('id') },
    data: { status: 'removed', body: '[Comment removed]' }
  });
  return context.body(null, 204);
});

communityRouter.get('/notifications', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const prisma = createDatabase(context.env.DATABASE_URL);
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        message: true,
        readAt: true,
        createdAt: true,
        actor: { select: { id: true, username: true, name: true } },
        post: { select: { slug: true, title: true } }
      }
    }),
    prisma.notification.count({ where: { recipientId: userId, readAt: null } })
  ]);
  return context.json({ notifications, unread });
});

communityRouter.post('/notifications/read', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const body = await context.req.json<{ ids?: string[] }>().catch(() => ({ ids: undefined }));
  await createDatabase(context.env.DATABASE_URL).notification.updateMany({
    where: { recipientId: userId, readAt: null, ...(body.ids?.length ? { id: { in: body.ids } } : {}) },
    data: { readAt: new Date() }
  });
  return context.json({ read: true });
});

communityRouter.post('/users/:id/:action', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const targetId = context.req.param('id');
  const action = context.req.param('action');
  if (!['block', 'mute'].includes(action) || targetId === userId)
    return context.json({ error: 'Invalid safety action.' }, 400);
  const body = await context.req.json<{ enabled?: boolean }>();
  if (typeof body.enabled !== 'boolean') return context.json({ error: 'An enabled state is required.' }, 400);
  const prisma = createDatabase(context.env.DATABASE_URL);
  if (action === 'block') {
    if (body.enabled) {
      await prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        create: { blockerId: userId, blockedId: targetId },
        update: {}
      });
      await prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetId },
            { followerId: targetId, followingId: userId }
          ]
        }
      });
    } else await prisma.userBlock.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
  } else if (body.enabled)
    await prisma.userMute.upsert({
      where: { muterId_mutedId: { muterId: userId, mutedId: targetId } },
      create: { muterId: userId, mutedId: targetId },
      update: {}
    });
  else await prisma.userMute.deleteMany({ where: { muterId: userId, mutedId: targetId } });
  return context.json({ enabled: body.enabled });
});

communityRouter.post('/reports', async (context) => {
  const userId = context.get('userId');
  if (!userId) return context.json(unauthorized(), 401);
  const parsed = reportInput.safeParse(await context.req.json());
  if (!parsed.success || ![parsed.data.postId, parsed.data.commentId, parsed.data.userId].some(Boolean))
    return context.json({ error: 'Choose content and a valid report reason.' }, 400);
  const report = await createDatabase(context.env.DATABASE_URL).contentReport.create({
    data: {
      reporterId: userId,
      reportedUserId: parsed.data.userId,
      postId: parsed.data.postId,
      commentId: parsed.data.commentId,
      reason: parsed.data.reason,
      details: parsed.data.details || null
    },
    select: { id: true, status: true }
  });
  return context.json({ report }, 201);
});
