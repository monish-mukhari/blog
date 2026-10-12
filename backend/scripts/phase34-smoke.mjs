import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const api = process.env.API_URL || 'http://127.0.0.1:8787';
const marker = `phase34_${Date.now()}`;
const authorEmail = `${marker}_author@example.com`;
const readerEmail = `${marker}_reader@example.com`;
let authorToken = '';
let readerToken = '';
let storyId = '';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
const databaseUrl = envText.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;

if (process.argv.includes('--cleanup')) {
  if (!prisma) throw new Error('DATABASE_URL is unavailable for cleanup.');
  const result = await prisma.user.deleteMany({ where: { email: { startsWith: 'phase34_' } } });
  console.log(JSON.stringify({ status: 'clean', removedAccounts: result.count }));
  await prisma.$disconnect();
  process.exit(0);
}

const request = async (path, options = {}) => {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* token response */ }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${text}`);
  return body;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  authorToken = await request('/api/v1/user/signup', {
    method: 'POST', body: JSON.stringify({ email: authorEmail, password: 'test-password-123', name: 'Phase Author' })
  });
  readerToken = await request('/api/v1/user/signup', {
    method: 'POST', body: JSON.stringify({ email: readerEmail, password: 'test-password-123', name: 'Phase Reader' })
  });
  const authorProfile = await request('/api/v1/community/profile/me', { headers: auth(authorToken) });
  const readerProfile = await request('/api/v1/community/profile/me', { headers: auth(readerToken) });
  const authorId = authorProfile.profile.id;
  await request('/api/v1/community/profile/me', {
    method: 'PUT', headers: auth(authorToken), body: JSON.stringify({
      username: `${marker}_author`.slice(0, 30), name: 'Phase Author', headline: 'Teaches clearly', bio: 'Integration test author',
      avatarUrl: '', website: '', location: 'Test Lab', digestFrequency: 'weekly'
    })
  });
  await request('/api/v1/community/profile/me', {
    method: 'PUT', headers: auth(readerToken), body: JSON.stringify({
      username: `${marker}_reader`.slice(0, 30), name: 'Phase Reader', headline: 'Learns deeply', bio: '',
      avatarUrl: '', website: '', location: '', digestFrequency: 'daily'
    })
  });
  const series = await request('/api/v1/learning/series', {
    method: 'POST', headers: auth(authorToken), body: JSON.stringify({ title: `Learning series ${marker}` })
  });
  const draft = await request('/api/v1/blog/drafts', {
    method: 'POST', headers: auth(authorToken), body: JSON.stringify({
      title: `Learning story ${marker}`, excerpt: 'A complete Phase 3 and 4 integration story.',
      content: '## First concept\n\nLearn the first concept.\n\n## Second concept\n\nApply the second concept.',
      contentFormat: 'markdown', tags: ['Technology'], learningOutcomes: ['Explain the architecture'],
      prerequisites: ['Basic web knowledge'], difficulty: 'beginner', references: ['https://example.com/reference'],
      lastReviewedAt: new Date().toISOString(), seriesId: series.series.id, seriesOrder: 1,
      quizQuestions: [{ question: 'Which phase adds learning tools?', options: ['Phase 2', 'Phase 3'], correctIndex: 1, explanation: 'Phase 3 focuses on learning.' }]
    })
  });
  storyId = draft.draft.id;
  const published = await request(`/api/v1/blog/${storyId}/publish`, { method: 'POST', headers: auth(authorToken), body: '{}' });
  const story = await request(`/api/v1/blog/${published.slug}`, { headers: auth(readerToken) });
  assert(story.blog.learningOutcomes.length === 1, 'Learning outcomes missing');
  assert(story.blog.quizQuestions.length === 1, 'Quiz missing');
  assert(story.blog.seriesStories.length === 1, 'Series navigation missing');
  await request(`/api/v1/blog/author/${authorId}/follow`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ followed: true }) });
  const following = await request('/api/v1/blog/bulk?following=true', { headers: auth(readerToken) });
  assert(following.blogs.some((item) => item.id === storyId), 'Following feed missing story');
  await request(`/api/v1/learning/stories/${storyId}/progress`, { method: 'PUT', headers: auth(readerToken), body: JSON.stringify({ progress: 0.42 }) });
  const continued = await request('/api/v1/learning/continue', { headers: auth(readerToken) });
  assert(continued.items.some((item) => item.post.id === storyId), 'Continue reading missing story');
  const note = await request(`/api/v1/learning/stories/${storyId}/notes`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ quote: 'First concept', note: 'Review this later.', color: 'yellow' }) });
  assert(note.note.note === 'Review this later.', 'Private note was not saved');
  const comment = await request(`/api/v1/community/posts/${storyId}/comments`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ body: 'This explanation was useful.' }) });
  await request(`/api/v1/community/posts/${storyId}/comments`, { method: 'POST', headers: auth(authorToken), body: JSON.stringify({ body: 'Thanks for learning with us.', parentId: comment.comment.id }) });
  const comments = await request(`/api/v1/community/posts/${storyId}/comments`, { headers: auth(readerToken) });
  assert(comments.comments.length === 2, 'Threaded discussion missing comments');
  const authorNotifications = await request('/api/v1/community/notifications', { headers: auth(authorToken) });
  const readerNotifications = await request('/api/v1/community/notifications', { headers: auth(readerToken) });
  assert(authorNotifications.notifications.length >= 2, 'Author notifications missing');
  assert(readerNotifications.notifications.some((item) => item.type === 'reply'), 'Reply notification missing');
  const quiz = await request(`/api/v1/learning/quiz/${story.blog.quizQuestions[0].id}/attempt`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ answer: 1 }) });
  assert(quiz.correct, 'Quiz answer was not evaluated');
  const profile = await request(`/api/v1/community/profile/${authorId}`, { headers: auth(readerToken) });
  const profileStories = await request(`/api/v1/community/profile/${authorId}/stories`);
  assert(profile.profile.followed && profileStories.stories.length === 1, 'Public author archive incomplete');
  await request('/api/v1/community/reports', { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ postId: storyId, reason: 'other', details: 'Automated safety smoke test' }) });
  await request(`/api/v1/community/users/${authorId}/mute`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ enabled: true }) });
  await request(`/api/v1/community/users/${authorId}/mute`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ enabled: false }) });
  await request(`/api/v1/community/users/${authorId}/block`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ enabled: true }) });
  await request(`/api/v1/community/users/${authorId}/block`, { method: 'POST', headers: auth(readerToken), body: JSON.stringify({ enabled: false }) });
  console.log(JSON.stringify({ status: 'pass', checks: 16, storyId }));
} finally {
  if (storyId && authorToken) {
    await request(`/api/v1/blog/${storyId}`, { method: 'DELETE', headers: auth(authorToken) }).catch(() => undefined);
  }
  if (prisma) {
    await prisma.user.deleteMany({ where: { email: { in: [authorEmail, readerEmail] } } }).catch(() => undefined);
    const remaining = await prisma.user.count({ where: { email: { in: [authorEmail, readerEmail] } } });
    if (remaining) throw new Error(`Smoke-test cleanup left ${remaining} temporary account(s).`);
    await prisma.$disconnect();
  }
}
