import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { BACKEND_URL } from '../config';

interface ContinueItem {
  progress: number;
  updatedAt: string;
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt?: string;
    coverImageUrl?: string;
    author: { id: string; name?: string; username?: string };
  };
}

export const ContinueReading = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/learning/continue`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      })
      .then((response) => setItems(response.data.items || []))
      .catch(() => navigate('/signin'))
      .finally(() => setLoading(false));
  }, [navigate]);
  return (
    <div className="page-shell">
      <AppBar />
      <main className="container-main max-w-5xl py-12">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2563eb]">Your learning</p>
        <h1 className="mt-2 font-display text-5xl font-semibold">Continue reading</h1>
        {loading ? (
          <p className="py-16 text-center text-[var(--muted)]">Loading your progress…</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {items.map(({ post, progress }) => (
              <Link
                key={post.id}
                to={`/story/${post.slug}`}
                className="rounded-2xl border border-[var(--line)] bg-white p-6"
              >
                <p className="text-xs font-semibold text-[#2563eb]">{Math.round(progress * 100)}% complete</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-[var(--line)]">
                  <div className="h-full bg-[#2563eb]" style={{ width: `${progress * 100}%` }} />
                </div>
                <h2 className="mt-5 font-display text-3xl font-semibold">{post.title}</h2>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{post.excerpt}</p>
                )}
                <p className="mt-4 text-xs text-[var(--muted)]">
                  By {post.author.name || post.author.username || 'Anonymous'}
                </p>
              </Link>
            ))}
            {!items.length && (
              <p className="text-[var(--muted)]">Open a story and your reading progress will appear here.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
