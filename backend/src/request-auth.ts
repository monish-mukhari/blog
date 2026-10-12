import { verify } from 'hono/jwt';

export const readUserId = async (authorization: string | undefined, secret: string) => {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return undefined;
  try {
    const payload = await verify(token, secret, 'HS256');
    return typeof payload.id === 'string' ? payload.id : undefined;
  } catch {
    return undefined;
  }
};
