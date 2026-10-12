import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { ImageUploader } from '../components/ImageUploader';
import { BACKEND_URL } from '../config';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const initial = {
  username: '',
  name: '',
  headline: '',
  bio: '',
  avatarUrl: '',
  website: '',
  location: '',
  digestFrequency: 'weekly'
};

export const ProfileSettings = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('Loading your profile…');
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/community/profile/me`, { headers: headers() })
      .then((response) => {
        setForm({ ...initial, ...response.data.profile });
        setStatus('');
      })
      .catch(() => navigate('/signin'));
  }, [navigate]);
  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Saving…');
    try {
      const response = await axios.put(`${BACKEND_URL}/api/v1/community/profile/me`, form, {
        headers: headers()
      });
      setStatus('Profile saved');
      setForm((current) => ({ ...current, ...response.data.profile }));
    } catch (error) {
      setStatus(
        axios.isAxiosError(error)
          ? error.response?.data?.error || 'Profile could not be saved.'
          : 'Profile could not be saved.'
      );
    }
  };
  return (
    <div className="page-shell">
      <AppBar />
      <main className="container-main max-w-3xl py-12">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2563eb]">Account</p>
        <h1 className="mt-2 font-display text-5xl font-semibold">Public profile</h1>
        <form
          onSubmit={submit}
          className="mt-8 space-y-5 rounded-2xl border border-[var(--line)] bg-white p-6 md:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Display name" value={form.name} onChange={(value) => update('name', value)} />
            <Field
              label="Username"
              value={form.username || ''}
              onChange={(value) => update('username', value.toLowerCase())}
            />
          </div>
          <Field
            label="Headline"
            value={form.headline || ''}
            onChange={(value) => update('headline', value)}
            maxLength={120}
          />
          <label className="block text-sm font-semibold">
            Bio
            <textarea
              value={form.bio || ''}
              onChange={(event) => update('bio', event.target.value)}
              maxLength={500}
              className="mt-2 min-h-32 w-full rounded-lg border border-[var(--line)] p-3 font-normal outline-none focus:border-[#2563eb]"
            />
          </label>
          <ImageUploader
            title="Profile image"
            description="Upload a square portrait or a clear personal mark."
            currentUrl={form.avatarUrl || ''}
            initialAlt="Profile image"
            onUploaded={({ url }) => update('avatarUrl', url)}
            onRemove={() => update('avatarUrl', '')}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Website"
              value={form.website || ''}
              onChange={(value) => update('website', value)}
            />
            <Field
              label="Location"
              value={form.location || ''}
              onChange={(value) => update('location', value)}
            />
          </div>
          <label className="block text-sm font-semibold">
            Email digest
            <select
              value={form.digestFrequency}
              onChange={(event) => update('digestFrequency', event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white p-3 font-normal"
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <div className="flex items-center justify-between">
            <p role="status" className="text-sm text-[var(--muted)]">
              {status}
            </p>
            <button className="rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white">
              Save profile
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  maxLength = 2000
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) => (
  <label className="block text-sm font-semibold">
    {label}
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={maxLength}
      className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 font-normal outline-none focus:border-[#2563eb]"
    />
  </label>
);
