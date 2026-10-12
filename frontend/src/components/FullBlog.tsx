import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';
import { Blog } from '../hooks';
import { blogCategory, formatDate, readTime } from '../lib/blog';
import { AppBar } from './AppBar';
import { Avatar, StoryArt } from './BlogCard';
import { setStorySaved } from '../lib/interactions';
import { applyStoryMetadata } from '../lib/metadata';
import { Icon } from './Icon';
import { MarkdownArticle } from './MarkdownArticle';
import { LearningOverview, ReaderNotes, StoryConnections, StoryQuiz, TableOfContents } from './StoryLearning';
import { Discussion } from './Discussion';

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
export const FullBlog = ({ blog }: { blog: Blog }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(blog.liked));
  const [clapCount, setClapCount] = useState(blog.clapCount || 0);
  const [saved, setSaved] = useState(Boolean(blog.saved));
  const [followed, setFollowed] = useState(Boolean(blog.author.followed));
  const [followerCount, setFollowerCount] = useState(blog.author.followerCount || 0);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(blog.readingProgress || 0);
  const lastSavedProgress = useRef(blog.readingProgress || 0);
  const storyPath = blog.slug ? `/story/${blog.slug}` : `/blog/${blog.id}`;

  useEffect(() => {
    const description = blog.excerpt || blog.content?.replace(/\s+/g, ' ').slice(0, 280) || '';
    return applyStoryMetadata({
      title: blog.title,
      description,
      canonicalUrl: `${window.location.origin}${storyPath}`,
      author: blog.author.name || 'Anonymous',
      publishedAt: blog.publishedAt || blog.createdAt,
      updatedAt: blog.updatedAt,
      imageUrl: blog.coverImageUrl || `${window.location.origin}/og-default.png`
    });
  }, [
    blog.author.name,
    blog.content,
    blog.coverImageUrl,
    blog.createdAt,
    blog.excerpt,
    blog.publishedAt,
    blog.title,
    blog.updatedAt,
    storyPath
  ]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    let timer = 0;
    const updateProgress = () => {
      const article = document.getElementById('story-content');
      if (!article) return;
      const start = article.offsetTop;
      const distance = Math.max(1, article.offsetHeight - window.innerHeight * 0.5);
      const next = Math.max(0, Math.min(1, (window.scrollY - start + window.innerHeight * 0.35) / distance));
      setProgress(next);
      if (next - lastSavedProgress.current < 0.05 && next < 0.95) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        lastSavedProgress.current = next;
        void axios.put(
          `${BACKEND_URL}/api/v1/learning/stories/${blog.id}/progress`,
          { progress: next },
          { headers: auth() }
        );
      }, 500);
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.clearTimeout(timer);
    };
  }, [blog.id]);

  useEffect(() => {
    const saved = blog.readingProgress || 0;
    if (saved < 0.05 || saved >= 0.95) return;
    const timer = window.setTimeout(() => {
      const article = document.getElementById('story-content');
      if (!article) return;
      const distance = Math.max(0, article.offsetHeight - window.innerHeight * 0.5);
      window.scrollTo({ top: article.offsetTop + distance * saved, behavior: 'smooth' });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [blog.id, blog.readingProgress]);

  const tell = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2500);
  };

  const requireAccount = () => {
    if (localStorage.getItem('token')) return true;
    navigate('/signin', { state: { from: storyPath } });
    return false;
  };

  const handleInteractionError = (error: unknown, message: string) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('token');
      navigate('/signin', { state: { from: storyPath } });
      return;
    }
    tell(message);
  };

  const toggleLike = async () => {
    if (!requireAccount()) return;
    if (busy) return;
    const previous = liked;
    const next = !liked;
    setLiked(next);
    setClapCount((value) => Math.max(0, value + (next ? 1 : -1)));
    setBusy('like');
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/blog/${blog.id}/clap`,
        { liked: next },
        { headers: auth() }
      );
      setClapCount(response.data.clapCount);
    } catch (error) {
      setLiked(previous);
      setClapCount((value) => Math.max(0, value + (next ? -1 : 1)));
      handleInteractionError(error, 'Appreciation could not be updated');
    } finally {
      setBusy('');
    }
  };
  const toggleSave = async () => {
    if (!requireAccount()) return;
    if (busy) return;
    const next = !saved;
    setSaved(next);
    setBusy('save');
    try {
      await setStorySaved(blog.id, next);
      tell(next ? 'Story saved' : 'Story removed from saved stories');
    } catch (error) {
      setSaved(!next);
      handleInteractionError(error, 'Bookmark could not be updated');
    } finally {
      setBusy('');
    }
  };
  const toggleFollow = async () => {
    if (!requireAccount()) return;
    if (busy) return;
    const previous = followed;
    const next = !followed;
    setFollowed(next);
    setFollowerCount((value) => Math.max(0, value + (next ? 1 : -1)));
    setBusy('follow');
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/blog/author/${blog.author.id}/follow`,
        { followed: next },
        { headers: auth() }
      );
      setFollowerCount(response.data.followerCount);
    } catch (error) {
      setFollowed(previous);
      setFollowerCount((value) => Math.max(0, value + (next ? -1 : 1)));
      handleInteractionError(error, 'Follow status could not be updated');
    } finally {
      setBusy('');
    }
  };
  const share = async () => {
    const shareUrl = `${window.location.origin}${storyPath}`;
    try {
      if (navigator.share) await navigator.share({ title: blog.title, url: shareUrl });
      else {
        await navigator.clipboard.writeText(shareUrl);
        tell('Link copied to clipboard');
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') tell('Could not share this story');
    }
  };
  return (
    <div className="page-shell">
      <AppBar />
      <div
        className="fixed left-0 top-[72px] z-30 h-1 bg-[#2563eb] transition-[width]"
        style={{ width: `${Math.round(progress * 100)}%` }}
        aria-hidden="true"
      />
      <main>
        <header className="container-main max-w-5xl pb-12 pt-16 text-center">
          <span className="inline-block rounded-lg bg-[#eff6ff] px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-[#2563eb]">
            {blogCategory(blog)}
          </span>
          <h1 className="mx-auto mt-7 max-w-4xl font-display text-5xl font-semibold leading-[.98] tracking-[-.04em] md:text-7xl">
            {blog.title}
          </h1>
          {blog.excerpt && (
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">{blog.excerpt}</p>
          )}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Avatar size="big" name={blog.author.name || 'Anonymous'} />
            <div className="text-left text-sm">
              <Link
                to={`/author/${blog.author.username || blog.author.id}`}
                className="font-semibold hover:text-[#2563eb]"
              >
                {blog.author.name || 'Anonymous'}
              </Link>
              <p className="text-[var(--muted)]">
                {formatDate(blog.createdAt)} · {readTime(blog.content)} min read
              </p>
            </div>
          </div>
        </header>
        <div className="container-main max-w-6xl">
          {blog.coverImageUrl ? (
            <img
              src={blog.coverImageUrl}
              alt={blog.coverImageAlt || ''}
              className="max-h-[620px] w-full rounded-[20px] object-cover"
            />
          ) : (
            <StoryArt title={blog.title} large />
          )}
        </div>
        <div className="container-main grid max-w-5xl gap-10 py-14 md:grid-cols-[64px_1fr_220px]">
          <aside className="order-2 flex gap-2 md:order-1 md:flex-col">
            <Action
              label={`${clapCount} appreciation${clapCount === 1 ? '' : 's'}`}
              onClick={toggleLike}
              active={liked}
              disabled={busy === 'like'}
              icon="heart"
            />
            <Action
              label={saved ? 'Saved' : 'Save'}
              onClick={toggleSave}
              active={saved}
              disabled={busy === 'save'}
              icon="bookmark"
            />
            <Action label="Share" onClick={share} icon="share" />
          </aside>
          <article id="story-content" className="order-1 min-w-0 md:order-2">
            <LearningOverview blog={blog} />
            <MarkdownArticle content={blog.content || ''} />
            <ReaderNotes postId={blog.id} />
            <StoryQuiz questions={blog.quizQuestions} />
          </article>
          <aside className="order-3">
            <div className="sticky top-28 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)]">Written by</p>
              <div className="mt-4 flex items-center gap-3">
                <Avatar size="big" name={blog.author.name || 'Anonymous'} />
                <div>
                  <Link
                    to={`/author/${blog.author.username || blog.author.id}`}
                    className="font-semibold hover:text-[#2563eb]"
                  >
                    {blog.author.name || 'Anonymous'}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {followerCount} follower{followerCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                {blog.author.bio ||
                  blog.author.headline ||
                  'Curious mind, careful observer, and contributor to the Inkwell community.'}
              </p>
              <button
                type="button"
                onClick={toggleFollow}
                disabled={busy === 'follow'}
                className={`mt-5 w-full rounded-lg border py-2 text-sm font-semibold disabled:opacity-50 ${followed ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[#2563eb] text-[#2563eb]'}`}
              >
                {followed ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className="mt-4">
              <TableOfContents content={blog.content || ''} />
            </div>
          </aside>
        </div>
        <StoryConnections blog={blog} />
        <Discussion postId={blog.id} />
      </main>
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#10213d] px-4 py-3 text-sm text-white shadow-xl"
        >
          {notice}
        </div>
      )}
    </div>
  );
};
const Action = ({
  label,
  onClick,
  active = false,
  disabled = false,
  icon
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: 'heart' | 'bookmark' | 'share';
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`focus-ring group relative grid h-12 w-12 place-items-center rounded-lg border transition disabled:opacity-50 ${active ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[#2563eb]'}`}
    aria-label={label}
  >
    <Icon name={icon} size={19} filled={active} />
    <span className="pointer-events-none absolute left-14 hidden whitespace-nowrap rounded bg-[#10213d] px-2 py-1 text-xs text-white md:block md:opacity-0 md:group-hover:opacity-100">
      {label}
    </span>
  </button>
);
