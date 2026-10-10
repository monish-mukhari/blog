import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { BlogCard } from '../components/BlogCard';
import { BlogSkeleton } from '../components/BlogSkeleton';
import { Icon } from '../components/Icon';
import { useBlogs } from '../hooks';
import { categories } from '../lib/blog';

const SEARCH_DELAY_MS = 350;

export const Blogs = () => {
  const [params, setParams] = useSearchParams();
  const savedView = params.get('view') === 'saved';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('For you');
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const updateSavedState = (event: Event) => {
      const { id, saved } = (event as CustomEvent<{ id: string; saved: boolean }>).detail;
      setSavedOverrides((current) => ({ ...current, [id]: saved }));
    };

    window.addEventListener('saved-change', updateSavedState);
    return () => window.removeEventListener('saved-change', updateSavedState);
  }, []);

  const { loading, loadingMore, blogs, error, total, hasMore, reload, loadMore } = useBlogs({
    search: debouncedSearch,
    topic: category === 'For you' ? '' : category,
    saved: savedView
  });

  const visibleBlogs = useMemo(
    () => blogs.filter((blog) => !savedView || (savedOverrides[blog.id] ?? blog.saved ?? false)),
    [blogs, savedOverrides, savedView]
  );

  const showAllStories = () => setParams({});

  return (
    <div className="page-shell">
      <AppBar search={search} onSearch={setSearch} />
      <main className="container-main pb-20">
        <section className="flex flex-col gap-5 pb-9 pt-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#2563eb]">
              <Icon name={savedView ? 'bookmark' : 'spark'} size={16} />
              {savedView ? 'Your personal library' : 'Fresh perspectives, daily'}
            </p>
            <h1 className="font-display text-5xl font-semibold tracking-[-.035em] md:text-7xl">
              {savedView ? (
                'Stories you'
              ) : (
                <>
                  Stories worth
                  <br />
                </>
              )}
              <em className="font-medium text-[#2563eb]">{savedView ? ' saved.' : ' staying for.'}</em>
            </h1>
          </div>
          <div className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            <p>
              {savedView
                ? 'Everything you bookmarked, gathered in one quiet place.'
                : 'Ideas, experiences, and useful lessons from curious people around the world.'}
            </p>
            {!loading && !error && (
              <p className="mt-2 font-semibold text-[var(--ink)]">
                {total} {total === 1 ? 'story' : 'stories'}
              </p>
            )}
          </div>
        </section>

        <nav
          className="mb-8 flex gap-2 overflow-x-auto border-b border-[var(--line)] pb-4"
          aria-label="Story categories"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                category === item
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {error ? (
          <StateCard title={savedView ? 'Your library is private.' : 'A small plot twist.'} message={error}>
            {!error.includes('Sign in') && (
              <button
                type="button"
                onClick={reload}
                className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try again
              </button>
            )}
            {error.includes('Sign in') && (
              <Link
                to="/signin"
                className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            )}
          </StateCard>
        ) : loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <BlogSkeleton key={item} />
            ))}
          </div>
        ) : visibleBlogs.length ? (
          <>
            {!savedView && <BlogCard blog={visibleBlogs[0]} featured />}
            <div className={`${savedView ? '' : 'mt-10'} grid gap-5 md:grid-cols-2 lg:grid-cols-3`}>
              {visibleBlogs.slice(savedView ? 0 : 1).map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[#2563eb] disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore ? 'Loading stories…' : 'Load more stories'}
                </button>
              </div>
            )}
          </>
        ) : (
          <StateCard
            title={savedView ? 'No saved stories yet' : 'No stories found'}
            message={
              savedView
                ? 'Bookmark any story and it will appear here.'
                : 'Try another topic, or be the first to write about it.'
            }
          >
            {savedView ? (
              <button
                type="button"
                onClick={showAllStories}
                className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Browse stories
              </button>
            ) : (
              <Link
                to="/publish"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white"
              >
                <Icon name="write" size={17} />
                Start writing
              </Link>
            )}
          </StateCard>
        )}
      </main>

      <footer className="border-t border-[var(--line)] py-8">
        <div className="container-main flex flex-col justify-between gap-3 text-xs text-[var(--muted)] sm:flex-row">
          <span>© 2026 Inkwell. Made for ideas that matter.</span>
          <span>Read deeply · Write freely · Stay curious</span>
        </div>
      </footer>
    </div>
  );
};

interface StateCardProps {
  title: string;
  message: string;
  children: React.ReactNode;
}

const StateCard = ({ title, message, children }: StateCardProps) => (
  <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-16 text-center">
    <h2 className="font-display text-3xl font-semibold">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-[var(--muted)]">{message}</p>
    <div className="mt-6 flex justify-center gap-3">{children}</div>
  </div>
);
