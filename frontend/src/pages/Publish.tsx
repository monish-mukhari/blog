import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { ImageUploader } from '../components/ImageUploader';
import { MarkdownArticle } from '../components/MarkdownArticle';
import { LearningEditor } from '../components/LearningEditor';
import { BACKEND_URL } from '../config';
import { readTime } from '../lib/blog';
import { emptyLearningDraft, LearningDraft } from '../lib/learning-draft';

const topics = ['Design', 'Technology', 'Culture', 'Work', 'Life'];
const LOCAL_DRAFT_KEY = 'inkwell-draft';

interface Draft {
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  topic: string;
  coverImageUrl: string;
  coverImageAlt: string;
  sourcePostId?: string;
  scheduledAt?: string;
  learning: LearningDraft;
}

const emptyDraft: Draft = {
  title: '',
  excerpt: '',
  content: '',
  topic: 'Design',
  coverImageUrl: '',
  coverImageAlt: '',
  learning: emptyLearningDraft
};
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
      topic: topics.includes(parsed.topic || '') ? parsed.topic! : 'Design',
      coverImageUrl: parsed.coverImageUrl || '',
      coverImageAlt: parsed.coverImageAlt || '',
      sourcePostId: parsed.sourcePostId,
      scheduledAt: parsed.scheduledAt,
      learning: { ...emptyLearningDraft, ...(parsed.learning || {}) }
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
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [coverImageAlt, setCoverImageAlt] = useState(initial.coverImageAlt);
  const [sourcePostId, setSourcePostId] = useState(initial.sourcePostId);
  const [scheduledAt, setScheduledAt] = useState(initial.scheduledAt || '');
  const [learning, setLearning] = useState(initial.learning);
  const [scheduleValue, setScheduleValue] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(
    initial.title || initial.content ? 'Local draft restored' : 'Not saved yet'
  );
  const [loadingDraft, setLoadingDraft] = useState(Boolean(routeDraftId));
  const [publishing, setPublishing] = useState(false);
  const [serverDraftsUnavailable, setServerDraftsUnavailable] = useState(false);
  const [error, setError] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const words = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content]);

  useEffect(() => {
    if (!routeDraftId) return;
    setLoadingDraft(true);
    axios
      .get(`${BACKEND_URL}/api/v1/blog/manage/${routeDraftId}`, { headers: authHeaders() })
      .then((response) => {
        const draft = response.data.story;
        setDraftId(draft.id);
        setTitle(draft.title || '');
        setExcerpt(draft.excerpt || '');
        setContent(draft.content || '');
        setTopic(topics.includes(draft.tags?.[0]) ? draft.tags[0] : 'Design');
        setCoverImageUrl(draft.coverImageUrl || '');
        setCoverImageAlt(draft.coverImageAlt || '');
        setSourcePostId(draft.sourcePostId);
        setScheduledAt(draft.scheduledAt || '');
        setLearning({
          learningOutcomes: draft.learningOutcomes || [],
          prerequisites: draft.prerequisites || [],
          difficulty: draft.difficulty || '',
          references: draft.references || [],
          lastReviewedAt: draft.lastReviewedAt || '',
          seriesId: draft.seriesId || '',
          seriesOrder: draft.seriesOrder || undefined,
          quizQuestions: draft.quizQuestions || []
        });
        setDirty(false);
        setStatus(draft.scheduledAt ? 'Scheduled publication' : 'Draft loaded');
      })
      .catch((requestError) => {
        if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/signin', { state: { from: `/write/${routeDraftId}` } });
          return;
        }
        setError('This story could not be loaded. It may have been removed.');
      })
      .finally(() => setLoadingDraft(false));
  }, [navigate, routeDraftId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const snapshot = useCallback(
    (id = draftId): Draft => ({
      id,
      title,
      excerpt,
      content,
      topic,
      coverImageUrl,
      coverImageAlt,
      sourcePostId,
      scheduledAt,
      learning
    }),
    [
      content,
      coverImageAlt,
      coverImageUrl,
      draftId,
      excerpt,
      learning,
      scheduledAt,
      sourcePostId,
      title,
      topic
    ]
  );

  const storeLocally = useCallback(
    (id = draftId) => localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(snapshot(id))),
    [draftId, snapshot]
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
          {
            id: draftId,
            title,
            excerpt,
            content,
            contentFormat: 'markdown',
            tags: [topic],
            coverImageUrl,
            coverImageAlt,
            ...learning,
            difficulty: learning.difficulty || null,
            lastReviewedAt: learning.lastReviewedAt || null,
            seriesId: learning.seriesId || null,
            seriesOrder: learning.seriesOrder || null,
            quizQuestions: learning.quizQuestions.filter(
              (question) =>
                question.question.trim().length >= 5 &&
                question.options.length >= 2 &&
                question.options.every((option) => option.trim())
            )
          },
          { headers: authHeaders() }
        );
        const savedId = response.data.draft.id as string;
        setDraftId(savedId);
        storeLocally(savedId);
        setDirty(false);
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
    [
      content,
      coverImageAlt,
      coverImageUrl,
      draftId,
      excerpt,
      learning,
      navigate,
      routeDraftId,
      serverDraftsUnavailable,
      storeLocally,
      title,
      topic
    ]
  );

  useEffect(() => {
    if (!dirty || (!title && !excerpt && !content)) return;
    storeLocally();
    setStatus(serverDraftsUnavailable ? 'Saving on this device…' : 'Syncing draft…');
    const timer = window.setTimeout(() => void persistDraft(true), 900);
    return () => window.clearTimeout(timer);
  }, [
    content,
    coverImageAlt,
    coverImageUrl,
    dirty,
    excerpt,
    learning,
    persistDraft,
    serverDraftsUnavailable,
    storeLocally,
    title,
    topic
  ]);

  const update = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setDirty(true);
    setError('');
  };

  const editSelection = (before: string, after = '', placeholder = 'text') => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    update(setContent, `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertImage = ({ url, alt, caption }: { url: string; alt: string; caption?: string }) => {
    const position = contentRef.current?.selectionStart ?? content.length;
    const markdown = `\n![${alt}](${url}${caption ? ` "${caption.replace(/"/g, "'")}"` : ''})\n`;
    update(setContent, `${content.slice(0, position)}${markdown}${content.slice(position)}`);
  };

  const discard = async () => {
    if (draftId && !window.confirm('Discard this draft permanently?')) return;
    if (draftId && !serverDraftsUnavailable) {
      try {
        await axios.delete(`${BACKEND_URL}/api/v1/blog/${draftId}`, { headers: authHeaders() });
      } catch {
        setError('The server draft could not be removed. You can retry from My Stories.');
        return;
      }
    }
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setDirty(false);
    navigate('/stories/mine', { replace: true });
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
      if (!savedId) {
        setError('Sync the draft successfully before publishing.');
        return;
      }
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/blog/${savedId}/publish`,
        {},
        { headers: authHeaders() }
      );
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setDirty(false);
      navigate(`/story/${response.data.slug}`);
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error || 'We could not publish your story.'
          : 'We could not publish your story.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const schedule = async () => {
    if (!scheduleValue) {
      setError('Choose a publication date and time.');
      return;
    }
    setPublishing(true);
    try {
      const savedId = await persistDraft(false);
      if (!savedId) throw new Error('Save the draft before scheduling it.');
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/blog/${savedId}/schedule`,
        { scheduledAt: new Date(scheduleValue).toISOString() },
        { headers: authHeaders() }
      );
      setScheduledAt(response.data.scheduledAt);
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setDirty(false);
      navigate('/stories/mine');
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error || 'The story could not be scheduled.'
          : requestError instanceof Error
            ? requestError.message
            : 'The story could not be scheduled.'
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
      <main className="container-main max-w-6xl py-10">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2563eb]">
              {sourcePostId ? 'Editing published story safely' : draftId ? 'Editing draft' : 'New story'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {status} · {words} words · {readTime(content)} min read
              {scheduledAt ? ` · Scheduled ${new Date(scheduledAt).toLocaleString()}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(title || excerpt || content) && (
              <button
                type="button"
                onClick={discard}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--muted)]"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={() => setPreviewing((value) => !value)}
              className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
            >
              {previewing ? 'Edit' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={() => void persistDraft(false)}
              className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {publishing ? 'Working…' : sourcePostId ? 'Publish update' : 'Publish'}
              {!publishing && <Icon name="arrow" size={17} />}
            </button>
          </div>
        </header>

        {previewing ? (
          <article className="mx-auto max-w-4xl rounded-[24px] border border-[var(--line)] bg-white p-6 sm:p-12">
            {coverImageUrl && (
              <img
                src={coverImageUrl}
                alt={coverImageAlt}
                className="mb-10 max-h-[520px] w-full rounded-xl object-cover"
              />
            )}
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2563eb]">{topic}</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight">
              {title || 'Untitled story'}
            </h1>
            {excerpt && <p className="my-6 text-lg leading-8 text-[var(--muted)]">{excerpt}</p>}
            <MarkdownArticle content={content || '*Your story preview will appear here.*'} />
          </article>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-10">
              <div className="flex gap-2 overflow-x-auto pb-7">
                {topics.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => update(setTopic, item)}
                    className={`rounded-lg px-4 py-2 text-xs font-bold ${topic === item ? 'bg-[#2563eb] text-white' : 'bg-white text-[var(--muted)]'}`}
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
                onChange={(event) => update(setTitle, event.target.value)}
                rows={2}
                className="w-full resize-none bg-transparent font-display text-5xl font-semibold leading-[1.02] outline-none placeholder:text-[var(--muted)]/45"
                placeholder="Give your story a title…"
              />
              <label className="sr-only" htmlFor="story-excerpt">
                Story summary
              </label>
              <textarea
                id="story-excerpt"
                value={excerpt}
                maxLength={280}
                onChange={(event) => update(setExcerpt, event.target.value)}
                rows={2}
                className="mt-5 w-full resize-none bg-transparent text-lg leading-8 text-[var(--muted)] outline-none"
                placeholder="A short summary for readers and search results…"
              />
              <div className="my-7 h-px bg-[var(--line)]" />
              <div className="mb-4 flex flex-wrap gap-2" aria-label="Markdown formatting tools">
                <Tool label="Heading" onClick={() => editSelection('## ', '', 'Section heading')} />
                <Tool label="Bold" onClick={() => editSelection('**', '**', 'bold text')} />
                <Tool label="Italic" onClick={() => editSelection('*', '*', 'italic text')} />
                <Tool
                  label="Link"
                  onClick={() => editSelection('[', '](https://example.com)', 'link text')}
                />
                <Tool label="Quote" onClick={() => editSelection('> ', '', 'Quoted text')} />
                <Tool label="List" onClick={() => editSelection('- ', '', 'List item')} />
                <Tool label="Code" onClick={() => editSelection('```\n', '\n```', 'code')} />
              </div>
              <label className="sr-only" htmlFor="story-body">
                Story content in Markdown
              </label>
              <textarea
                ref={contentRef}
                id="story-body"
                value={content}
                maxLength={50000}
                onChange={(event) => update(setContent, event.target.value)}
                rows={20}
                className="min-h-[560px] w-full resize-y bg-transparent font-mono text-base leading-7 outline-none"
                placeholder={
                  'Start writing in Markdown…\n\n## Add a heading\n\nUse **bold**, *italic*, lists, links, quotes, and code.'
                }
              />
            </section>

            <aside className="space-y-5">
              <ImageUploader
                title="Cover image"
                description="Displayed above the story and used for social previews. Images are resized and compressed before upload."
                currentUrl={coverImageUrl}
                initialAlt={coverImageAlt}
                onUploaded={(media) => {
                  update(setCoverImageUrl, media.url);
                  setCoverImageAlt(media.alt);
                }}
                onAltChange={(value) => update(setCoverImageAlt, value)}
                onRemove={() => {
                  update(setCoverImageUrl, '');
                  setCoverImageAlt('');
                }}
              />
              <ImageUploader
                title="Inline image"
                description="Insert an accessible image at the current cursor position."
                includeCaption
                onUploaded={insertImage}
              />
              <LearningEditor value={learning} onChange={(value) => update(setLearning, value)} />
              <section className="rounded-xl border border-[var(--line)] bg-white p-4">
                <h3 className="text-sm font-semibold">Schedule publication</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  The Worker checks scheduled stories every five minutes.
                </p>
                <input
                  type="datetime-local"
                  value={scheduleValue}
                  min={new Date(Date.now() + 120_000).toISOString().slice(0, 16)}
                  onChange={(event) => setScheduleValue(event.target.value)}
                  className="mt-3 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={schedule}
                  disabled={publishing}
                  className="mt-3 w-full rounded-lg border border-[#2563eb] px-4 py-2 text-sm font-semibold text-[#2563eb] disabled:opacity-50"
                >
                  Schedule
                </button>
              </section>
            </aside>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}
      </main>
    </div>
  );
};

const Tool = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold hover:border-[#2563eb]"
  >
    {label}
  </button>
);
