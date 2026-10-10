import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import app from './index';

const env = {
  DATABASE_URL: 'prisma://unused-in-auth-test',
  JWT_SECRET: 'test-secret',
  FRONTEND_URL: 'http://localhost:5173'
};

describe('application routes', () => {
  it('reports service health', async () => {
    const response = await app.request('/health', {}, env);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('requires authentication before publishing', async () => {
    const response = await app.request(
      '/api/v1/blog',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'A useful story', content: 'Enough content to pass validation.' })
      },
      env
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Please sign in to continue.' });
  });
});
