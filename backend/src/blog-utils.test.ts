import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateReadingTime,
  createContentPreview,
  createStorySlug,
  parseStoryListOptions
} from './blog-utils';

describe('parseStoryListOptions', () => {
  it('provides safe defaults', () => {
    assert.deepEqual(parseStoryListOptions({}), {
      page: 1,
      limit: 12,
      search: '',
      topic: '',
      savedOnly: false
    });
  });

  it('clamps pagination and trims filters', () => {
    assert.deepEqual(
      parseStoryListOptions({
        page: '-5',
        limit: '100',
        search: '  TypeScript  ',
        topic: '  Technology  ',
        saved: 'true'
      }),
      { page: 1, limit: 24, search: 'TypeScript', topic: 'Technology', savedOnly: true }
    );
  });
});

describe('story summaries', () => {
  it('calculates a minimum one-minute reading time', () => {
    assert.equal(calculateReadingTime('A short story'), 1);
    assert.equal(calculateReadingTime(Array.from({ length: 221 }, () => 'word').join(' ')), 2);
  });

  it('normalizes whitespace and limits previews', () => {
    const preview = createContentPreview(`  First line.\n\nSecond line. ${'x'.repeat(300)}`);
    assert.equal(preview.startsWith('First line. Second line.'), true);
    assert.equal(preview.length, 240);
  });
});

describe('createStorySlug', () => {
  it('creates readable, stable, collision-resistant slugs', () => {
    assert.equal(
      createStorySlug('  Déjà Vu: A TypeScript Story!  ', '12345678-abcd-4000-9000-123456789abc'),
      'deja-vu-a-typescript-story-12345678ab'
    );
  });

  it('provides a fallback for titles without latin characters', () => {
    assert.equal(createStorySlug('你好', 'abcdef12-0000-4000-9000-123456789abc'), 'story-abcdef1200');
  });
});
