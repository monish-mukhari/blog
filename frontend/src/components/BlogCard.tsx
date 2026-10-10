import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Blog } from '../hooks';
import { blogCategory, excerpt, formatDate, initials, readTime, stringHash } from '../lib/blog';
import { setStorySaved } from '../lib/interactions';
import { Icon } from './Icon';

const cardPalettes = [
  ['#dbeafe', '#2563eb'],
  ['#eff6ff', '#1d4ed8'],
  ['#e0ecff', '#3b82f6'],
  ['#cfe0ff', '#1e40af']
];
export const StoryArt = ({ title, large = false }: { title: string; large?: boolean }) => {
  const p = cardPalettes[Math.abs(stringHash(title)) % cardPalettes.length];
  return (
    <div
      className={`grain relative overflow-hidden rounded-[24px] ${large ? 'min-h-[300px]' : 'h-36 sm:h-44'}`}
      style={{ background: p[0] }}
    >
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[22px] opacity-80"
        style={{ borderColor: p[1] }}
      />
      <div
        className="absolute bottom-6 left-6 h-16 w-16 rotate-12 rounded-2xl"
        style={{ background: p[1] }}
      />
      <div
        className="absolute bottom-7 right-7 font-display text-5xl font-bold opacity-20"
        style={{ color: p[1] }}
      >
        Aa
      </div>
    </div>
  );
};
export const Avatar = ({ name, size = 'small' }: { name: string; size?: 'small' | 'big' }) => (
  <div
    className={`inline-grid shrink-0 place-items-center rounded-full bg-[#10213d] font-semibold text-white ${size === 'small' ? 'h-7 w-7 text-[10px]' : 'h-11 w-11 text-sm'}`}
    aria-label={name}
  >
    {initials(name)}
  </div>
);

export const BlogCard = ({ blog, featured = false }: { blog: Blog; featured?: boolean }) => {
  const [saved, setSaved] = useState(Boolean(blog.saved));
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const storyUrl = blog.slug ? `/story/${blog.slug}` : `/blog/${blog.id}`;
  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!localStorage.getItem('token')) {
      navigate('/signin', { state: { from: storyUrl } });
      return;
    }
    if (busy) return;
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      await setStorySaved(blog.id, next);
    } catch (error) {
      setSaved(!next);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/signin', { state: { from: storyUrl } });
      }
    } finally {
      setBusy(false);
    }
  };
  if (featured)
    return (
      <Link
        to={storyUrl}
        className="group grid gap-7 rounded-[30px] border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(31,39,33,.10)] md:grid-cols-[1.05fr_.95fr] md:p-7"
      >
        <StoryArt title={blog.title} large />
        <div className="flex flex-col justify-center py-3">
          <span className="mb-5 w-fit rounded-lg bg-[#eff6ff] px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-[#2563eb]">
            Featured · {blogCategory(blog)}
          </span>
          <h2 className="font-display text-4xl font-semibold leading-[1.02] tracking-[-.025em] lg:text-5xl">
            {blog.title}
          </h2>
          <p className="mt-4 line-clamp-3 text-[var(--muted)]">{excerpt(blog)}</p>
          <div className="mt-7 flex items-center justify-between gap-3">
            <AuthorLine blog={blog} />
            <span className="flex items-center gap-2 text-sm font-semibold text-[#2563eb]">
              Read story <Icon name="arrow" size={17} />
            </span>
          </div>
        </div>
      </Link>
    );
  return (
    <Link
      to={storyUrl}
      className="group flex h-full flex-col rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(31,39,33,.09)]"
    >
      <StoryArt title={blog.title} />
      <div className="flex flex-1 flex-col px-1 pb-1 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-[#2563eb]">
            {blogCategory(blog)}
          </span>
          <button
            onClick={toggle}
            disabled={busy}
            className="focus-ring rounded-lg p-2 text-[var(--muted)] hover:bg-white hover:text-[#2563eb] disabled:opacity-50"
            aria-label={saved ? 'Remove bookmark' : 'Bookmark story'}
          >
            <Icon name="bookmark" size={18} filled={saved} />
          </button>
        </div>
        <h2 className="mt-3 line-clamp-2 font-display text-[1.7rem] font-semibold leading-[1.08] tracking-[-.015em] group-hover:text-[#2563eb]">
          {blog.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{excerpt(blog)}</p>
        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <AuthorLine blog={blog} />
        </div>
      </div>
    </Link>
  );
};
const AuthorLine = ({ blog }: { blog: Blog }) => (
  <div className="flex min-w-0 items-center gap-2.5">
    <Avatar name={blog.author.name || 'Anonymous'} />
    <div className="min-w-0 text-xs">
      <p className="truncate font-semibold">{blog.author.name || 'Anonymous'}</p>
      <p className="text-[var(--muted)]">
        {formatDate(blog.createdAt)} · {blog.readingTime || readTime(blog.content)} min read
      </p>
    </div>
  </div>
);
