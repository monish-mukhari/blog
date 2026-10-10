import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { BACKEND_URL } from '../config';
import { formatDate } from '../lib/blog';

interface ManagedStory {
  id: string;
  slug: string;
  title: string;
  contentPreview: string;
  published: boolean;
  updatedAt: string;
  readingTime: number;
  clapCount: number;
  bookmarkCount: number;
}

type StoryFilter = 'all' | 'draft' | 'published';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

export const MyStories = () => {
  const [stories, setStories] = useState<ManagedStory[]>([]);
  const [filter, setFilter] = useState<StoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');
  const navigate = useNavigate();

  const loadStories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/blog/mine`, {
        headers: authHeaders(),
        params: { status: filter === 'all' ? undefined : filter }
      });
      setStories(response.data.posts || []);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/signin', { state: { from: '/stories/mine' } });
        return;
      }
      setError('Your story dashboard will be available after the new backend is deployed.');
    } finally {
      setLoading(false);
    }
  }, [filter, navigate]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const deleteStory = async (story: ManagedStory) => {
    const confirmed = window.confirm(`Delete “${story.title || 'Untitled draft'}”? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(story.id);
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/blog/${story.id}`, { headers: authHeaders() });
      setStories((current) => current.filter((item) => item.id !== story.id));
    } catch {
      setError('The story could not be deleted. Please try again.');
    } finally {
      setDeleting('');
    }
  };

  return (
    <div className="page-shell">
      <AppBar />
      <main className="container-main max-w-5xl py-12">
        <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#2563eb]">Author workspace</p>
            <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.03em]">My stories</h1>
            <p className="mt-2 text-[var(--muted)]">Continue a draft or review your published work.</p>
          </div>
          <Link
            to="/publish"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white"
          >
            <Icon name="write" size={17} />
            New story
          </Link>
        </header>

        <div className="my-8 flex gap-2" role="group" aria-label="Filter your stories">
          {(['all', 'draft', 'published'] as StoryFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                filter === item ? 'bg-[#2563eb] text-white' : 'bg-[var(--surface)] text-[var(--muted)]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-sm text-[#1d4ed8]"
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-16 text-center text-[var(--muted)]">Loading your stories…</p>
        ) : stories.length ? (
          <div className="space-y-4">
            {stories.map((story) => {
              const destination = story.published ? `/story/${story.slug}` : `/write/${story.id}`;
              return (
                <article
                  key={story.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.12em] text-[#2563eb]">
                        <span>{story.published ? 'Published' : 'Draft'}</span>
                        <span className="text-[var(--muted)]">Updated {formatDate(story.updatedAt)}</span>
                      </div>
                      <h2 className="mt-2 truncate font-display text-3xl font-semibold">
                        {story.title || 'Untitled draft'}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                        {story.contentPreview || 'Start writing to give this draft a preview.'}
                      </p>
                      <p className="mt-3 text-xs text-[var(--muted)]">
                        {story.readingTime} min read
                        {story.published &&
                          ` · ${story.clapCount} appreciations · ${story.bookmarkCount} saves`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        to={destination}
                        className="rounded-lg border border-[#2563eb] px-4 py-2 text-sm font-semibold text-[#2563eb]"
                      >
                        {story.published ? 'View' : 'Continue'}
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteStory(story)}
                        disabled={deleting === story.id}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-white disabled:opacity-50"
                      >
                        {deleting === story.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center">
            <h2 className="font-display text-3xl font-semibold">
              No {filter === 'all' ? '' : filter} stories yet
            </h2>
            <p className="mt-2 text-[var(--muted)]">Your next useful idea can start here.</p>
          </div>
        )}
      </main>
    </div>
  );
};
