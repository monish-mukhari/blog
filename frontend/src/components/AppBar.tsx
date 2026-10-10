import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

interface AppBarProps {
  search?: string;
  onSearch?: (value: string) => void;
}

export const AppBar = ({ search, onSearch }: AppBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const signedIn = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const signOut = () => {
    localStorage.removeItem('token');
    setMenuOpen(false);
    navigate('/blogs');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur-xl">
      <div className="container-main flex h-[72px] items-center justify-between gap-5">
        <Link to="/blogs" className="focus-ring flex items-center gap-2 rounded-lg" aria-label="Inkwell home">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2563eb] text-xl font-bold text-white font-display">
            i.
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">inkwell</span>
        </Link>

        {onSearch && (
          <SearchInput value={search || ''} onChange={onSearch} className="hidden max-w-md flex-1 md:block" />
        )}

        <div className="flex items-center gap-2">
          <Link
            to={signedIn ? '/publish' : '/signin'}
            state={signedIn ? undefined : { from: '/publish' }}
            className="focus-ring hidden items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] sm:flex"
          >
            <Icon name="write" size={17} />
            Write
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)] bg-white text-[#2563eb]"
            aria-label={menuOpen ? 'Close account menu' : 'Open account menu'}
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? 'close' : 'user'} size={18} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="absolute right-5 top-[64px] w-52 rounded-xl border border-[var(--line)] bg-white p-2 shadow-xl animate-in">
          {signedIn ? (
            <>
              <Link
                to="/publish"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--surface)] sm:hidden"
              >
                <Icon name="write" size={17} />
                Write a story
              </Link>
              <Link
                to="/blogs?view=saved"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--surface)]"
              >
                <Icon name="bookmark" size={17} />
                Saved stories
              </Link>
              <Link
                to="/stories/mine"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--surface)]"
              >
                <Icon name="write" size={17} />
                My stories
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="mt-1 w-full border-t border-[var(--line)] px-3 pt-3 text-left text-sm text-[#1d4ed8]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-[var(--surface)]"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="block rounded-lg bg-[#eff6ff] px-3 py-2.5 text-sm font-semibold text-[#1d4ed8]"
              >
                Create an account
              </Link>
            </>
          )}
        </div>
      )}

      {onSearch && (
        <div className="container-main pb-3 md:hidden">
          <SearchInput value={search || ''} onChange={onSearch} />
        </div>
      )}
    </header>
  );
};

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const SearchInput = ({ value, onChange, className = '' }: SearchInputProps) => (
  <label className={`relative ${className}`}>
    <span className="absolute inset-y-0 left-4 flex items-center text-[var(--muted)]">
      <Icon name="search" size={18} />
    </span>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#2563eb] focus:bg-white"
      placeholder="Search stories, ideas, writers..."
      aria-label="Search stories"
    />
  </label>
);

export const LogoBar = () => (
  <div className="absolute left-6 top-6 z-10">
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2563eb] text-xl font-bold text-white font-display">
        i.
      </span>
      <span className="font-display text-2xl font-bold">inkwell</span>
    </Link>
  </div>
);
