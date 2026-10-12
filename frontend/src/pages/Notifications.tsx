import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { BACKEND_URL } from '../config';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
interface Notification {
  id: string;
  type: string;
  message: string;
  readAt?: string;
  createdAt: string;
  actor?: { id: string; username?: string; name?: string };
  post?: { slug: string; title: string };
}

export const Notifications = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/community/notifications`, { headers: headers() })
      .then((response) => setItems(response.data.notifications || []))
      .catch(() => navigate('/signin'))
      .finally(() => setLoading(false));
  }, [navigate]);
  const markAllRead = async () => {
    await axios.post(`${BACKEND_URL}/api/v1/community/notifications/read`, {}, { headers: headers() });
    setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
  };
  return (
    <div className="page-shell">
      <AppBar />
      <main className="container-main max-w-3xl py-12">
        <header className="flex items-end justify-between border-b border-[var(--line)] pb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2563eb]">Community</p>
            <h1 className="mt-2 font-display text-5xl font-semibold">Notifications</h1>
          </div>
          <button onClick={() => void markAllRead()} className="text-sm font-semibold text-[#2563eb]">
            Mark all read
          </button>
        </header>
        {loading ? (
          <p className="py-16 text-center text-[var(--muted)]">Loading notifications…</p>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                to={
                  item.post
                    ? `/story/${item.post.slug}`
                    : item.actor
                      ? `/author/${item.actor.username || item.actor.id}`
                      : '/blogs'
                }
                className={`block rounded-xl border p-5 ${item.readAt ? 'border-[var(--line)] bg-white' : 'border-[#93c5fd] bg-[#eff6ff]'}`}
              >
                <p className="text-sm font-semibold">{item.message}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {item.actor?.name || item.actor?.username || 'Inkwell'} ·{' '}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </Link>
            ))}
            {!items.length && (
              <p className="rounded-xl border border-dashed border-[var(--line)] p-12 text-center text-[var(--muted)]">
                You are all caught up.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
