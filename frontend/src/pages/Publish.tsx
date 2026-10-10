import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { BACKEND_URL } from '../config';
import { readTime } from '../lib/blog';

const topics = ['Design', 'Technology', 'Culture', 'Work', 'Life'];
const LOCAL_DRAFT_KEY = 'inkwell-draft';

interface Draft {
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  topic: string;
}

const emptyDraft: Draft = { title: '', excerpt: '', content: '', topic: 'Design' };
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const loadLocalDraft = (): Draft => {
  try {
    const value = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!value) return emptyDraft;
    const parsed = JSON.parse(value) as Partial<Draft>;
    return {
      id: parsed.id,
      title: parsed.title || '',
      excerpt: parsed.excerpt || '',
      content: parsed.content || '',
      topic: topics.includes(parsed.topic || '') ? parsed.topic! : 'Design'
    };
  } catch {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    return emptyDraft;
  }
};

export const Publish = () => {
  const { id: routeDraftId } = useParams();
  const initial = useMemo(loadLocalDraft, []);
  const [draftId, setDraftId] = useState(routeDraftId || initial.id);
  const [title, setTitle] = useState(initial.title);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [content, setContent] = useState(initial.content);
  const [topic, setTopic] = useState(initial.topic);
  const [status, setStatus] = useState(
    initial.title || initial.content ? 'Local draft restored' : 'Not saved yet'
  );
  const [loadingDraft, setLoadingDraft] = useState(Boolean(routeDraftId));
  const [publishing, setPublishing] = useState(false);
  const [serverDraftsUnavailable, setServerDraftsUnavailable] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const words = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content]);

  useEffect(() => {
    if (!routeDraftId) return;
    setLoadingDraft(true);
    axios
      .get(`${BACKEND_URL}/api/v1/blog/drafts/${routeDraftId}`, { headers: authHeaders() })
      .then((response) => {
        const draft = response.data.draft;
        setDraftId(draft.id);
        setTitle(draft.title || '');
        setExcerpt(draft.excerpt || '');
        setContent(draft.content || '');
        setTopic(topics.includes(draft.tags?.[0]) ? draft.tags[0] : 'Design');
        setStatus('Draft loaded');
      })
      .catch((requestError) => {
        if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/signin', { state: { from: `/write/${routeDraftId}` } });
          return;
        }
        setError('This draft could not be loaded. It may have been removed.');
      })
      .finally(() => setLoadingDraft(false));
  }, [navigate, routeDraftId]);

  const storeLocally = useCallback(
    (id = draftId) => {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({ id, title, excerpt, content, topic }));
    },
    [content, draftId, excerpt, title, topic]
  );

  const persistDraft = useCallback(
    async (silent: boolean): Promise<string | null | undefined> => {
      if (!title && !excerpt && !content) return draftId;
      storeLocally();

      if (serverDraftsUnavailable) {
        setStatus('Saved on this device');
        return null;
      }

      if (!silent) setStatus('Saving…');
      try {
        const response = await axios.post(
          `${BACKEND_URL}/api/v1/blog/drafts`,
          { id: draftId, title, excerpt, content, tags: [topic] },
          { headers: authHeaders() }
        );
        const savedId = response.data.draft.id as string;
        setDraftId(savedId);
        storeLocally(savedId);
        setStatus('Saved to your account');
        if (!routeDraftId) navigate(`/write/${savedId}`, { replace: true });
        return savedId;
      } catch (requestError) {
        if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/signin', { state: { from: routeDraftId ? `/write/${routeDraftId}` : '/publish' } });
          return undefined;
        }
        if (axios.isAxiosError(requestError) && requestError.response?.status === 404) {
          setServerDraftsUnavailable(true);
          setStatus('Saved on this device');
          return null;
        }
        setStatus('Saved on this device');
        if (!silent) setError('The draft is safe on this device, but could not be synced to your account.');
        return undefined;
      }
    },
    [content, draftId, excerpt, navigate, routeDraftId, serverDraftsUnavailable, storeLocally, title, topic]
  );

  useEffect(() => {
    if (!title && !excerpt && !content) return;
    setStatus(serverDraftsUnavailable ? 'Saving on this device…' : 'Syncing draft…');
    const timer = window.setTimeout(() => void persistDraft(true), 900);
    return () => window.clearTimeout(timer);
  }, [content, excerpt, persistDraft, serverDraftsUnavailable, title, topic]);

  const discard = async () => {
    if (draftId && !window.confirm('Discard this draft permanently?')) return;
    if (draftId && !serverDraftsUnavailable) {
      try {
        await axios.delete(`${BACKEND_URL}/api/v1/blog/${draftId}`, { headers: authHeaders() });
      } catch {
        setError('The server draft could not be removed. You can retry from My stories.');
        return;
      }
    }
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setDraftId(undefined);
    setTitle('');
    setExcerpt('');
    setContent('');
    setTopic('Design');
    setStatus('Draft discarded');
    setError('');
    navigate('/publish', { replace: true });
  };

  const publishLegacyStory = async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/blog`,
      { title: title.trim(), excerpt: excerpt.trim(), content: content.trim(), tags: [topic] },
      { headers: authHeaders() }
    );
    return { id: response.data.id as string, slug: response.data.slug as string | undefined };
  };

  const publish = async () => {
    if (title.trim().length < 3 || content.trim().length < 20) {
      setError('Add a clear title and at least a few sentences before publishing.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const savedId = await persistDraft(false);
      let published: { id: string; slug?: string };
      if (savedId) {
        const response = await axios.post(
          `${BACKEND_URL}/api/v1/blog/${savedId}/publish`,
          {},
          { headers: authHeaders() }
        );
        published = response.data;
      } else if (savedId === null) {
        published = await publishLegacyStory();
      } else {
        setError('Sync the draft successfully before publishing.');
        return;
      }
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      navigate(published.slug ? `/story/${published.slug}` : `/blog/${published.id}`);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/signin', { state: { from: routeDraftId ? `/write/${routeDraftId}` : '/publish' } });
        return;
      }
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error || 'We could not publish your story. Please try again.'
          : 'We could not publish your story. Please try again.'
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loadingDraft) {
    return (
      <div className="page-shell">
        <AppBar />
        <p className="grid min-h-[70vh] place-items-center text-[var(--muted)]">Loading your draft…</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <AppBar />
      <main className="container-main max-w-5xl py-10">
        <div className="mb-9 flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2563eb]">
              {draftId ? 'Editing draft' : 'New story'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {status} · {words} words · {readTime(content)} min read
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(title || excerpt || content) && (
              <button
                type="button"
                onClick={discard}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[#eff6ff]"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={() => void persistDraft(false)}
              className="rounded-lg border border-[var(--line)] px-5 py-2.5 text-sm font-semibold"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {publishing ? 'Publishing…' : 'Publish'}
              {!publishing && <Icon name="arrow" size={17} />}
            </button>
          </div>
        </div>

        <section className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-10">
          <div className="flex gap-2 overflow-x-auto pb-7">
            {topics.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className={`rounded-lg px-4 py-2 text-xs font-bold ${
                  topic === item ? 'bg-[#2563eb] text-white' : 'bg-white text-[var(--muted)]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="story-title">
            Story title
          </label>
          <textarea
            id="story-title"
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            rows={2}
            className="w-full resize-none bg-transparent font-display text-5xl font-semibold leading-[1.02] tracking-[-.03em] outline-none placeholder:text-[var(--muted)]/45 md:text-6xl"
            placeholder="Give your story a title…"
          />
          <label className="sr-only" htmlFor="story-excerpt">
            Story summary
          </label>
          <textarea
            id="story-excerpt"
            value={excerpt}
            maxLength={280}
            onChange={(event) => setExcerpt(event.target.value)}
            rows={2}
            className="mt-5 w-full resize-none bg-transparent text-lg leading-8 text-[var(--muted)] outline-none placeholder:text-[var(--muted)]/55"
            placeholder="A short hook to invite readers in (optional)…"
          />
          <div className="my-8 h-px bg-[var(--line)]" />
          <label className="sr-only" htmlFor="story-body">
            Story content
          </label>
          <textarea
            id="story-body"
            value={content}
            maxLength={50000}
            onChange={(event) => setContent(event.target.value)}
            rows={16}
            className="article-body min-h-[480px] w-full resize-none bg-transparent outline-none placeholder:text-[var(--muted)]/45"
            placeholder="Tell your story…"
          />
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-4 text-sm text-[#1d4ed8]"
            >
              {error}
            </div>
          )}
        </section>
        <p className="mt-5 text-center text-xs text-[var(--muted)]">
          Drafts sync to your account when the backend is available and remain backed up on this device.
        </p>
      </main>
    </div>
  );
};
