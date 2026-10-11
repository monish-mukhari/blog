import { mediaUploadInput } from '@monish21/medium-common';
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { createDatabase } from '../db';

type Env = {
  Bindings: { DATABASE_URL: string; JWT_SECRET: string };
  Variables: { userId: string | undefined };
};

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maximumBytes = 3 * 1024 * 1024;

export const mediaRouter = new Hono<Env>();

mediaRouter.use('/*', async (context, next) => {
  context.set('userId', undefined);
  const header = context.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    try {
      const payload = await verify(token, context.env.JWT_SECRET, 'HS256');
      if (typeof payload.id === 'string') context.set('userId', payload.id);
    } catch {
      // The upload and delete handlers return the consistent authorization error.
    }
  }
  await next();
});

mediaRouter.post('/', async (context) => {
  const ownerId = context.get('userId');
  if (!ownerId) return context.json({ error: 'Please sign in to upload images.' }, 401);

  const parsed = mediaUploadInput.safeParse(await context.req.json());
  if (!parsed.success)
    return context.json({ error: 'Provide a valid image and useful alternative text.' }, 400);
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(parsed.data.dataUrl);
  if (!match || !allowedMimeTypes.has(match[1])) {
    return context.json({ error: 'Upload a JPEG, PNG, WebP, or GIF image.' }, 400);
  }

  const data = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  if (data.byteLength > maximumBytes) {
    return context.json({ error: 'The processed image must be smaller than 3 MB.' }, 413);
  }

  const prisma = createDatabase(context.env.DATABASE_URL);
  const media = await prisma.mediaAsset.create({
    data: {
      ownerId,
      mimeType: match[1],
      data,
      width: parsed.data.width,
      height: parsed.data.height,
      alt: parsed.data.alt
    },
    select: { id: true, alt: true, width: true, height: true }
  });
  const origin = new URL(context.req.url).origin;
  return context.json({ media: { ...media, url: `${origin}/media/${media.id}` } }, 201);
});

mediaRouter.delete('/:id', async (context) => {
  const ownerId = context.get('userId');
  if (!ownerId) return context.json({ error: 'Please sign in to manage images.' }, 401);
  const prisma = createDatabase(context.env.DATABASE_URL);
  const result = await prisma.mediaAsset.deleteMany({
    where: { id: context.req.param('id'), ownerId }
  });
  if (!result.count) return context.json({ error: 'Image not found.' }, 404);
  return context.body(null, 204);
});

export const serveMedia = async (databaseUrl: string, id: string) => {
  const prisma = createDatabase(databaseUrl);
  return prisma.mediaAsset.findUnique({
    where: { id },
    select: { data: true, mimeType: true, alt: true }
  });
};
