import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { blogRouter } from './routes/blog';
import { seoRouter } from './routes/seo';
import { userRouter } from './routes/user';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
};

const app = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string | undefined };
}>();
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
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);
app.get('/health', (context) => context.json({ status: 'ok' }));
app.route('/', seoRouter);
app.route('/api/v1/user', userRouter);
app.route('/api/v1/blog', blogRouter);
app.notFound((context) => context.json({ error: 'Not found' }, 404));
app.onError((error, context) => {
  console.error('unhandled_request_error', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: context.req.path
  });
  return context.json({ error: 'Internal server error' }, 500);
});
export default app;
