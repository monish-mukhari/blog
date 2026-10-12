import axios from 'axios';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';
import { Blog } from '../hooks';
import { extractHeadings } from '../lib/learning';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

interface Note {
  id: string;
  quote?: string;
  note: string;
  color: string;
  createdAt: string;
}

export const TableOfContents = ({ content }: { content: string }) => {
  const headings = useMemo(() => extractHeadings(content), [content]);
  if (!headings.length) return null;
  return (
    <nav aria-label="Table of contents" className="rounded-xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)]">In this story</p>
      <ol className="mt-3 space-y-2 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'pl-3' : ''}>
            <a className="text-[var(--muted)] hover:text-[#2563eb]" href={`#${heading.id}`}>
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export const LearningOverview = ({ blog }: { blog: Blog }) => {
  const hasDetails =
    blog.difficulty || blog.learningOutcomes?.length || blog.prerequisites?.length || blog.lastReviewedAt;
  if (!hasDetails) return null;
  return (
    <section
      className="mb-10 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-6"
      aria-labelledby="learning-overview"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="learning-overview" className="font-display text-2xl font-semibold">
          Before you begin
        </h2>
        {blog.difficulty && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-[#1d4ed8]">
            {blog.difficulty}
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {Boolean(blog.learningOutcomes?.length) && (
          <div>
            <h3 className="text-sm font-bold">You will learn</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--muted)]">
              {blog.learningOutcomes?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {Boolean(blog.prerequisites?.length) && (
          <div>
            <h3 className="text-sm font-bold">Prerequisites</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--muted)]">
              {blog.prerequisites?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {blog.lastReviewedAt && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Last reviewed {new Date(blog.lastReviewedAt).toLocaleDateString()}
        </p>
      )}
    </section>
  );
};

export const ReaderNotes = ({ postId }: { postId: string }) => {
  const navigate = useNavigate();
  const signedIn = Boolean(localStorage.getItem('token'));
  const [notes, setNotes] = useState<Note[]>([]);
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!signedIn) return;
    axios
      .get(`${BACKEND_URL}/api/v1/learning/stories/${postId}/notes`, { headers: headers() })
      .then((response) => setNotes(response.data.notes || []))
      .catch(() => setError('Your private notes could not be loaded.'));
  }, [postId, signedIn]);

  const captureSelection = () => {
    const selected = window.getSelection()?.toString().trim() || '';
    setQuote(selected.slice(0, 1000));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!signedIn) {
      navigate('/signin');
      return;
    }
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/learning/stories/${postId}/notes`,
        { note, quote: quote || undefined, color: 'yellow' },
        { headers: headers() }
      );
      setNotes((current) => [response.data.note, ...current]);
      setNote('');
      setQuote('');
      setError('');
    } catch {
      setError('Your note could not be saved.');
    }
  };

  const remove = async (id: string) => {
    await axios.delete(`${BACKEND_URL}/api/v1/learning/notes/${id}`, { headers: headers() });
    setNotes((current) => current.filter((item) => item.id !== id));
  };

  return (
    <section className="mt-12 border-t border-[var(--line)] pt-8" aria-labelledby="private-notes">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2563eb]">
            Private learning space
          </p>
          <h2 id="private-notes" className="mt-1 font-display text-3xl font-semibold">
            Highlights and notes
          </h2>
        </div>
        <button
          type="button"
          onClick={captureSelection}
          className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold"
        >
          Capture selected text
        </button>
      </div>
      <form onSubmit={submit} className="mt-4 rounded-xl bg-[var(--surface)] p-4">
        {quote && (
          <blockquote className="mb-3 border-l-2 border-[#2563eb] pl-3 text-sm text-[var(--muted)]">
            {quote}
          </blockquote>
        )}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={signedIn ? 'Write a private note…' : 'Sign in to keep private notes.'}
          className="min-h-24 w-full resize-y rounded-lg border border-[var(--line)] bg-white p-3 text-sm outline-none focus:border-[#2563eb]"
          maxLength={2000}
        />
        <button
          type="submit"
          className="mt-3 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
        >
          Save note
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-[#b42318]">{error}</p>}
      {notes.length > 0 && (
        <ul className="mt-4 space-y-3">
          {notes.map((item) => (
            <li key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm">
              {item.quote && (
                <blockquote className="mb-2 border-l-2 border-[#f59e0b] pl-3 text-[var(--muted)]">
                  {item.quote}
                </blockquote>
              )}
              <p className="whitespace-pre-wrap">{item.note}</p>
              <button
                type="button"
                onClick={() => void remove(item.id)}
                className="mt-2 text-xs font-semibold text-[var(--muted)]"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const StoryQuiz = ({ questions = [] }: { questions?: NonNullable<Blog['quizQuestions']> }) => {
  const navigate = useNavigate();
  const [results, setResults] = useState<
    Record<string, { correct: boolean; correctIndex: number; explanation?: string }>
  >({});
  const answer = async (questionId: string, selected: number) => {
    if (!localStorage.getItem('token')) {
      navigate('/signin');
      return;
    }
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/learning/quiz/${questionId}/attempt`,
      { answer: selected },
      { headers: headers() }
    );
    setResults((current) => ({ ...current, [questionId]: response.data }));
  };
  if (!questions.length) return null;
  return (
    <section className="mt-12 rounded-2xl bg-[#10213d] p-6 text-white" aria-labelledby="knowledge-check">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-[#93c5fd]">Knowledge check</p>
      <h2 id="knowledge-check" className="mt-2 font-display text-3xl font-semibold">
        Check what you learned
      </h2>
      <div className="mt-6 space-y-7">
        {questions.map((question, index) => {
          const result = results[question.id];
          return (
            <div key={question.id}>
              <h3 className="font-semibold">
                {index + 1}. {question.question}
              </h3>
              <div className="mt-3 grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() => void answer(question.id, optionIndex)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm disabled:cursor-default ${
                      result?.correctIndex === optionIndex
                        ? 'border-[#86efac] bg-[#14532d]'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {result && (
                <p className={`mt-3 text-sm ${result.correct ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>
                  {result.correct ? 'Correct.' : 'Not quite.'} {result.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const StoryConnections = ({ blog }: { blog: Blog }) => (
  <section className="container-main max-w-5xl pb-16">
    {Boolean(blog.seriesStories?.length) && (
      <div className="rounded-2xl border border-[var(--line)] p-6">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2563eb]">Learning series</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">{blog.series?.title}</h2>
        <ol className="mt-4 grid gap-2">
          {blog.seriesStories?.map((story, index) => (
            <li key={story.id}>
              <Link
                className={`block rounded-lg px-4 py-3 text-sm ${story.id === blog.id ? 'bg-[#eff6ff] font-bold text-[#1d4ed8]' : 'bg-[var(--surface)]'}`}
                to={`/story/${story.slug}`}
              >
                {index + 1}. {story.title}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    )}
    {Boolean(blog.relatedStories?.length) && (
      <div className="mt-10">
        <h2 className="font-display text-3xl font-semibold">Continue learning</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {blog.relatedStories?.map((story) => (
            <Link
              key={story.id}
              to={`/story/${story.slug}`}
              className="rounded-xl border border-[var(--line)] bg-white p-5"
            >
              <h3 className="font-display text-xl font-semibold">{story.title}</h3>
              {story.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">{story.excerpt}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    )}
    {Boolean(blog.references?.length) && (
      <div className="mt-10">
        <h2 className="font-display text-3xl font-semibold">References</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          {blog.references?.map((reference) => (
            <li key={reference}>
              <a
                className="break-all text-[#2563eb] underline"
                href={reference}
                target="_blank"
                rel="noreferrer"
              >
                {reference}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}
  </section>
);
