import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignupInput } from '@monish21/medium-common';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { Icon } from './Icon';

export const Auth = ({ type }: { type: 'signup' | 'signin' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [postInputs, setPostInputs] = useState<SignupInput>({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sendRequest = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/user/${type}`, postInputs);
      localStorage.setItem('token', response.data);
      const destination = (location.state as { from?: string } | null)?.from || '/blogs';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ||
              err.response?.data?.message ||
              'Something went wrong. Please try again.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-28">
      <div className="w-full max-w-[430px] animate-in">
        <p className="mb-3 text-sm font-bold uppercase tracking-[.16em] text-[#3457d5]">
          {type === 'signup' ? 'Your next chapter' : 'Welcome back'}
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-[-.03em]">
          {type === 'signup' ? 'Create your space.' : 'Keep the story going.'}
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          {type === 'signup'
            ? 'Share what you know. Discover what moves you.'
            : 'Sign in to find your saved stories and fresh ideas.'}
        </p>
        <form onSubmit={sendRequest} className="mt-9 space-y-5">
          {type === 'signup' && (
            <LabelledInput
              label="Your name"
              placeholder="What should we call you?"
              autoComplete="name"
              onChange={(e) => setPostInputs({ ...postInputs, name: e.target.value })}
            />
          )}
          <LabelledInput
            label="Email address"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            onChange={(e) => setPostInputs({ ...postInputs, email: e.target.value })}
          />
          <LabelledInput
            label="Password"
            placeholder="At least 6 characters"
            type="password"
            autoComplete={type === 'signup' ? 'new-password' : 'current-password'}
            onChange={(e) => setPostInputs({ ...postInputs, password: e.target.value })}
          />
          {error && (
            <div role="alert" className="rounded-xl bg-[#ff674d]/10 px-4 py-3 text-sm text-[#c74331]">
              {error}
            </div>
          )}
          <button
            disabled={loading}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3.5 font-semibold text-[var(--paper)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Please wait…' : type === 'signup' ? 'Create my account' : 'Sign in'}
            {!loading && <Icon name="arrow" size={18} />}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-[var(--muted)]">
          {type === 'signup' ? 'Already have an account?' : 'New to Inkwell?'}{' '}
          <Link
            className="font-semibold text-[var(--ink)] underline decoration-[#ff674d] decoration-2 underline-offset-4"
            to={type === 'signup' ? '/signin' : '/signup'}
          >
            {type === 'signup' ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <p className="mt-8 text-center text-xs leading-5 text-[var(--muted)]">
          By continuing, you agree to our Terms and acknowledge our Privacy Policy.
        </p>
      </div>
    </main>
  );
};
interface LabelledInputType {
  label: string;
  placeholder: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
}
function LabelledInput({ label, placeholder, onChange, type = 'text', autoComplete }: LabelledInputType) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        onChange={onChange}
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[#3457d5] focus:ring-4 focus:ring-[#3457d5]/10"
        placeholder={placeholder}
        required
        minLength={type === 'password' ? 6 : undefined}
      />
    </label>
  );
}
