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
  scheduledAt?: string;
  sourcePostId?: string;
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
  const [busy, setBusy] = useState('');
  const [revisions, setRevisions] = useState<
    Record<string, Array<{ id: string; title: string; createdAt: string }>>
  >({});
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

  const storyAction = async (story: ManagedStory, action: 'edit' | 'duplicate' | 'unpublish') => {
    setBusy(`${action}:${story.id}`);
    setError('');
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/blog/${story.id}/${action}`,
        {},
        { headers: authHeaders() }
      );
      if (action === 'edit' || action === 'duplicate') {
        navigate(`/write/${response.data.draft.id}`);
        return;
      }
      await loadStories();
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error || `The story could not be ${action}ed.`
          : `The story could not be ${action}ed.`
      );
    } finally {
      setBusy('');
    }
  };

  const cancelSchedule = async (story: ManagedStory) => {
    setBusy(`schedule:${story.id}`);
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/blog/${story.id}/schedule`, { headers: authHeaders() });
      await loadStories();
    } catch {
      setError('The scheduled publication could not be cancelled.');
    } finally {
      setBusy('');
    }
  };

  const toggleRevisions = async (story: ManagedStory) => {
    if (revisions[story.id]) {
      setRevisions((current) => {
        const next = { ...current };
        delete next[story.id];
        return next;
      });
      return;
    }
    setBusy(`revisions:${story.id}`);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/blog/${story.id}/revisions`, {
        headers: authHeaders()
      });
      setRevisions((current) => ({ ...current, [story.id]: response.data.revisions || [] }));
    } catch {
      setError('Revision history could not be loaded.');
    } finally {
      setBusy('');
    }
  };

  const restoreRevision = async (story: ManagedStory, revisionId: string) => {
    if (!window.confirm('Restore this revision? The current version will remain in revision history.'))
      return;
    setBusy(`restore:${story.id}`);
    try {
      await axios.post(
        `${BACKEND_URL}/api/v1/blog/${story.id}/revisions/${revisionId}/restore`,
        {},
        { headers: authHeaders() }
      );
      setRevisions((current) => {
        const next = { ...current };
        delete next[story.id];
        return next;
      });
      await loadStories();
    } catch {
      setError('The revision could not be restored.');
    } finally {
      setBusy('');
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
              const stateLabel = story.published
                ? 'Published'
                : story.scheduledAt
                  ? 'Scheduled'
                  : story.sourcePostId
                    ? 'Update draft'
                    : 'Draft';
              return (
                <article
                  key={story.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.12em] text-[#2563eb]">
                        <span>{stateLabel}</span>
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
                        {story.scheduledAt && ` · Publishes ${new Date(story.scheduledAt).toLocaleString()}`}
                        {story.published &&
                          ` · ${story.clapCount} appreciations · ${story.bookmarkCount} saves`}
                      </p>
                    </div>
                    <div className="flex max-w-sm shrink-0 flex-wrap justify-end gap-2">
                      {story.published ? (
                        <>
                          <Link
                            to={destination}
                            className="rounded-lg border border-[#2563eb] px-3 py-2 text-sm font-semibold text-[#2563eb]"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => void storyAction(story, 'edit')}
                            disabled={Boolean(busy)}
                            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void storyAction(story, 'unpublish')}
                            disabled={Boolean(busy)}
                            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                          >
                            Unpublish
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleRevisions(story)}
                            disabled={Boolean(busy)}
                            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                          >
                            History
                          </button>
                        </>
                      ) : (
                        <Link
                          to={destination}
                          className="rounded-lg border border-[#2563eb] px-3 py-2 text-sm font-semibold text-[#2563eb]"
                        >
                          Continue
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void storyAction(story, 'duplicate')}
                        disabled={Boolean(busy)}
                        className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                      >
                        Duplicate
                      </button>
                      {story.scheduledAt && (
                        <button
                          type="button"
                          onClick={() => void cancelSchedule(story)}
                          disabled={Boolean(busy)}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)]"
                        >
                          Cancel schedule
                        </button>
                      )}
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
                  {revisions[story.id] && (
                    <div className="mt-5 border-t border-[var(--line)] pt-4">
                      <h3 className="text-sm font-semibold">Revision history</h3>
                      {revisions[story.id].length ? (
                        <ul className="mt-3 space-y-2">
                          {revisions[story.id].map((revision) => (
                            <li
                              key={revision.id}
                              className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                            >
                              <span>
                                {revision.title} · {new Date(revision.createdAt).toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => void restoreRevision(story, revision.id)}
                                disabled={Boolean(busy)}
                                className="font-semibold text-[#2563eb]"
                              >
                                Restore
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          No earlier revisions have been recorded yet.
                        </p>
                      )}
                    </div>
                  )}
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
