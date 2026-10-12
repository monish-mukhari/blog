import type { Database } from './db';
import { logError, logEvent } from './observability';

interface DigestEnvironment {
  DIGEST_WEBHOOK_URL?: string;
  DIGEST_WEBHOOK_TOKEN?: string;
  FRONTEND_URL?: string;
}

const intervalMs = (frequency: string) => (frequency === 'daily' ? 24 : 24 * 7) * 60 * 60 * 1000;

export const sendDueDigests = async (prisma: Database, env: DigestEnvironment) => {
  if (!env.DIGEST_WEBHOOK_URL) return 0;
  const now = new Date();
  const users = await prisma.user.findMany({
    where: { digestFrequency: { in: ['daily', 'weekly'] }, following: { some: {} } },
    select: {
      id: true,
      email: true,
      name: true,
      digestFrequency: true,
      lastDigestAt: true,
      following: { select: { followingId: true } }
    }
  });
  let delivered = 0;
  for (const user of users) {
    const since = user.lastDigestAt || new Date(now.getTime() - intervalMs(user.digestFrequency));
    if (now.getTime() - since.getTime() < intervalMs(user.digestFrequency)) continue;
    const stories = await prisma.post.findMany({
      where: {
        published: true,
        publishedAt: { gt: since },
        authorId: { in: user.following.map((follow) => follow.followingId) }
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        author: { select: { name: true, username: true } }
      }
    });
    if (!stories.length) {
      await prisma.user.update({ where: { id: user.id }, data: { lastDigestAt: now } });
      continue;
    }
    try {
      const response = await fetch(env.DIGEST_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.DIGEST_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.DIGEST_WEBHOOK_TOKEN}` } : {})
        },
        body: JSON.stringify({
          event: 'learning_digest',
          recipient: { email: user.email, name: user.name },
          frequency: user.digestFrequency,
          stories: stories.map((story) => ({
            ...story,
            url: `${env.FRONTEND_URL || 'http://localhost:5173'}/story/${story.slug}`
          }))
        })
      });
      if (!response.ok) throw new Error(`Digest webhook returned ${response.status}`);
      await prisma.user.update({ where: { id: user.id }, data: { lastDigestAt: now } });
      delivered += 1;
    } catch (error) {
      logError('digest_delivery_failed', error, { userId: user.id });
    }
  }
  logEvent('digest_delivery_completed', { delivered });
  return delivered;
};
