import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { blogRouter } from './routes/blog';
import { mediaRouter, serveMedia } from './routes/media';
import { seoRouter } from './routes/seo';
import { userRouter } from './routes/user';
import { learningRouter } from './routes/learning';
import { communityRouter } from './routes/community';
import { logError, logEvent, reportError } from './observability';
import { createDatabase } from './db';
import { publishDueStories } from './publishing';
import { sendDueDigests } from './digests';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
  ERROR_MONITOR_URL?: string;
  ERROR_MONITOR_TOKEN?: string;
  DIGEST_WEBHOOK_URL?: string;
  DIGEST_WEBHOOK_TOKEN?: string;
};

const app = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string | undefined; requestId: string };
}>();
app.use('*', async (context, next) => {
  const requestId = context.req.header('X-Request-ID') || crypto.randomUUID();
  const startedAt = Date.now();
  context.set('requestId', requestId);
  context.header('X-Request-ID', requestId);
  await next();
  logEvent('request_completed', {
    requestId,
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
    durationMs: Date.now() - startedAt
  });
});
app.use(
  '/*',
  cors({
    origin: (origin, context) => {
      const configuredOrigin = context.env.FRONTEND_URL;
      if (!configuredOrigin) return origin;
      if (origin === configuredOrigin || origin.startsWith('http://localhost:')) return origin;
      return null;
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);
app.get('/health', (context) => context.json({ status: 'ok' }));
app.get('/media/:id', async (context) => {
  const media = await serveMedia(context.env.DATABASE_URL, context.req.param('id'));
  if (!media) return context.json({ error: 'Image not found.' }, 404);
  return new Response(media.data, {
    headers: {
      'Content-Type': media.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff'
    }
  });
});
app.route('/', seoRouter);
app.route('/api/v1/user', userRouter);
app.route('/api/v1/blog', blogRouter);
app.route('/api/v1/media', mediaRouter);
app.route('/api/v1/learning', learningRouter);
app.route('/api/v1/community', communityRouter);
app.notFound((context) => context.json({ error: 'Not found' }, 404));
app.onError((error, context) => {
  logError('unhandled_request_error', error, {
    requestId: context.get('requestId'),
    method: context.req.method,
    path: context.req.path
  });
  reportError(context, error);
  return context.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR', requestId: context.get('requestId') },
    500
  );
});

export { app };

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, context: ExecutionContext) {
    const prisma = createDatabase(env.DATABASE_URL);
    context.waitUntil(
      Promise.all([publishDueStories(prisma), sendDueDigests(prisma, env)]).then(([published, digests]) => {
        logEvent('scheduled_publication_completed', { published });
        logEvent('scheduled_digest_completed', { digests });
      })
    );
  }
};
